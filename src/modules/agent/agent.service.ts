import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AgentCommandStatus,
  AgentCommandType,
  Prisma,
  VpsNodeStatus,
} from '#/generated/prisma/client.js';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import { ServersService } from '#/modules/servers/services/servers.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import {
  AgentCommandResultDto,
  HeartbeatAgentDto,
  Phase1IngestDto,
  SiteStackSnapshotDto,
} from './dto/agent.dto.js';

const COMMAND_TTL_MS = 10 * 60 * 1000;
const COMMAND_LEASE_MS = 2 * 60 * 1000;
const MAX_COMMAND_ATTEMPTS = 3;

@Injectable()
export class AgentService {
  private readonly logger = createAppLogger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serversService: ServersService,
  ) {}

  async enroll(
    plaintextToken: string,
    agentInstanceId: string,
    agentVersion?: string,
  ) {
    return this.serversService.enrollWithToken(
      plaintextToken,
      agentInstanceId,
      agentVersion,
    );
  }

  async heartbeat(body: HeartbeatAgentDto) {
    const now = new Date();
    const existing = await this.requireUsableAgent(body.agentInstanceId);

    const [updated, commands] = await this.prisma.$transaction(async (tx) => {
      const agent = await tx.vpsNode.update({
        where: { id: existing.id },
        data: {
          lastHeartbeatAt: now,
          lastSeenAt: now,
          status: VpsNodeStatus.ONLINE,
          ...(body.agentVersion ? { agentVersion: body.agentVersion } : {}),
        },
        select: {
          id: true,
          agentInstanceId: true,
          lastHeartbeatAt: true,
          status: true,
        },
      });

      await tx.agentCommand.updateMany({
        where: {
          vpsNodeId: existing.id,
          status: {
            in: [AgentCommandStatus.QUEUED, AgentCommandStatus.RUNNING],
          },
          OR: [
            { expiresAt: { lte: now } },
            {
              attemptCount: { gte: MAX_COMMAND_ATTEMPTS },
              leaseExpiresAt: { lte: now },
            },
          ],
        },
        data: {
          status: AgentCommandStatus.EXPIRED,
          finishedAt: now,
          dedupeKey: null,
          errorCode: 'command_expired',
        },
      });

      const candidates = await tx.agentCommand.findMany({
        where: {
          vpsNodeId: existing.id,
          expiresAt: { gt: now },
          attemptCount: { lt: MAX_COMMAND_ATTEMPTS },
          OR: [
            { status: AgentCommandStatus.QUEUED },
            {
              status: AgentCommandStatus.RUNNING,
              leaseExpiresAt: { lte: now },
            },
          ],
        },
        orderBy: { requestedAt: 'asc' },
        take: 10,
      });

      const leased: Array<{
        id: string;
        type: AgentCommandType;
        domain: string;
        expiresAt: Date;
        leaseExpiresAt: Date;
      }> = [];
      for (const candidate of candidates) {
        const leaseExpiresAt = new Date(now.getTime() + COMMAND_LEASE_MS);
        const claimed = await tx.agentCommand.updateMany({
          where: {
            id: candidate.id,
            status: candidate.status,
            attemptCount: candidate.attemptCount,
          },
          data: {
            status: AgentCommandStatus.RUNNING,
            leasedAt: now,
            leaseExpiresAt,
            attemptCount: { increment: 1 },
          },
        });
        if (claimed.count === 1) {
          leased.push({
            id: candidate.id,
            type: candidate.type,
            domain: candidate.domain,
            expiresAt: candidate.expiresAt,
            leaseExpiresAt,
          });
        }
      }

      return [agent, leased] as const;
    });

    this.logger.debug('agent.heartbeat.received', {
      agentInstanceId: body.agentInstanceId,
      vpsNodeId: updated.id,
      leasedCommandCount: commands.length,
    });

    return {
      agent: {
        agentInstanceId: updated.agentInstanceId,
        status: updated.status,
        lastHeartbeatAt: updated.lastHeartbeatAt,
      },
      commands,
    };
  }

  async processPhase1Ingest(payload: Phase1IngestDto) {
    const startedAt = Date.now();
    const agent = await this.requireUsableAgent(payload.agentInstanceId);

    const result = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.vpsNode.update({
        where: { id: agent.id },
        data: {
          lastSeenAt: now,
          ...(payload.agentVersion
            ? { agentVersion: payload.agentVersion }
            : {}),
        },
      });

      let discoveryCount = 0;
      if (payload.discoveries !== undefined) {
        const activeDomains = payload.discoveries.map((item) => item.domain);
        for (const discovery of payload.discoveries) {
          await tx.websiteDiscovery.upsert({
            where: {
              serverId_domain: {
                serverId: agent.serverId,
                domain: discovery.domain,
              },
            },
            create: {
              serverId: agent.serverId,
              vpsNodeId: agent.id,
              domain: discovery.domain,
              displayName: discovery.domain,
              aliases: discovery.aliases,
              virtualHostName: discovery.virtualHostName,
              source: discovery.source,
              discoveredAt: new Date(discovery.discoveredAt),
              isPresent: true,
              removedAt: null,
              rawPayload: discovery as unknown as Prisma.InputJsonValue,
              lastIngestedAt: now,
            },
            update: {
              vpsNodeId: agent.id,
              aliases: discovery.aliases,
              virtualHostName: discovery.virtualHostName,
              source: discovery.source,
              discoveredAt: new Date(discovery.discoveredAt),
              isPresent: true,
              removedAt: null,
              rawPayload: discovery as unknown as Prisma.InputJsonValue,
              lastIngestedAt: now,
            },
          });
        }

        await tx.websiteDiscovery.updateMany({
          where: {
            serverId: agent.serverId,
            vpsNodeId: agent.id,
            isPresent: true,
            ...(activeDomains.length > 0
              ? { domain: { notIn: activeDomains } }
              : {}),
          },
          data: {
            isPresent: false,
            removedAt: now,
            lastIngestedAt: now,
          },
        });
        discoveryCount = payload.discoveries.length;
      }

      let stackCount = 0;
      for (const snapshot of payload.siteStacks ?? []) {
        const discovery = await this.findDiscovery(
          tx,
          agent.serverId,
          snapshot.domain,
        );
        if (!discovery) continue;
        await this.applyStackSnapshot(tx, discovery.id, snapshot);
        stackCount += 1;
      }

      let activeVisitorCount = 0;
      for (const sample of payload.activeVisitors3m ?? []) {
        const discovery = await this.findDiscovery(
          tx,
          agent.serverId,
          sample.domain,
        );
        if (!discovery) continue;
        await tx.websiteTrafficSnapshot.upsert({
          where: { discoveryId: discovery.id },
          create: {
            discoveryId: discovery.id,
            websiteId: discovery.websiteId,
            domain: sample.domain,
            activeVisitorCount: sample.uniqueVisitorCount ?? null,
            activeWindowSeconds: sample.windowSeconds,
            activeWindowStartedAt: new Date(sample.windowStartedAt),
            activeMeasuredAt: new Date(sample.measuredAt),
            activeStatus: sample.status as unknown as Prisma.InputJsonValue,
          },
          update: {
            websiteId: discovery.websiteId,
            domain: sample.domain,
            activeVisitorCount: sample.uniqueVisitorCount ?? null,
            activeWindowSeconds: sample.windowSeconds,
            activeWindowStartedAt: new Date(sample.windowStartedAt),
            activeMeasuredAt: new Date(sample.measuredAt),
            activeStatus: sample.status as unknown as Prisma.InputJsonValue,
          },
        });
        activeVisitorCount += 1;
      }

      let visitors24hCount = 0;
      for (const sample of payload.visitors24h ?? []) {
        const discovery = await this.findDiscovery(
          tx,
          agent.serverId,
          sample.domain,
        );
        if (!discovery) continue;
        await tx.websiteTrafficSnapshot.upsert({
          where: { discoveryId: discovery.id },
          create: {
            discoveryId: discovery.id,
            websiteId: discovery.websiteId,
            domain: sample.domain,
            uniqueVisitors24h: sample.uniqueVisitors24h ?? null,
            visitors24hWindowSeconds: sample.windowSeconds,
            visitors24hCoverageSeconds: sample.coverageSeconds,
            visitors24hMeasuredAt: new Date(sample.measuredAt),
            visitors24hAlgorithm: sample.algorithm,
            visitors24hStatus:
              sample.status as unknown as Prisma.InputJsonValue,
          },
          update: {
            websiteId: discovery.websiteId,
            domain: sample.domain,
            uniqueVisitors24h: sample.uniqueVisitors24h ?? null,
            visitors24hWindowSeconds: sample.windowSeconds,
            visitors24hCoverageSeconds: sample.coverageSeconds,
            visitors24hMeasuredAt: new Date(sample.measuredAt),
            visitors24hAlgorithm: sample.algorithm,
            visitors24hStatus:
              sample.status as unknown as Prisma.InputJsonValue,
          },
        });
        visitors24hCount += 1;
      }

      return {
        vpsNodeId: agent.id,
        discoveryCount,
        stackCount,
        activeVisitorCount,
        visitors24hCount,
      };
    });

    this.logger.log('agent.ingest.phase1.stored', {
      agentInstanceId: payload.agentInstanceId,
      ...result,
      durationMs: Date.now() - startedAt,
    });
    return result;
  }

  async submitCommandResult(commandId: string, body: AgentCommandResultDto) {
    const agent = await this.requireUsableAgent(body.agentInstanceId);

    return this.prisma.$transaction(async (tx) => {
      const command = await tx.agentCommand.findUnique({
        where: { id: commandId },
      });
      if (!command || command.vpsNodeId !== agent.id) {
        throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
      }

      if (
        command.status === AgentCommandStatus.SUCCEEDED ||
        command.status === AgentCommandStatus.FAILED ||
        command.status === AgentCommandStatus.EXPIRED
      ) {
        return command;
      }

      const now = new Date();
      if (
        command.status !== AgentCommandStatus.RUNNING ||
        !command.leaseExpiresAt ||
        command.leaseExpiresAt < now
      ) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }

      const finishedAt = new Date(body.finishedAt);
      if (body.status === 'SUCCEEDED') {
        if (
          !body.stackSnapshot ||
          body.stackSnapshot.domain !== command.domain
        ) {
          throw new BadRequestException(ERROR_MESSAGES.fa.validation);
        }
        await this.applyStackSnapshot(
          tx,
          command.discoveryId,
          body.stackSnapshot,
        );
      } else {
        await tx.websiteDiscovery.update({
          where: { id: command.discoveryId },
          data: {
            stackCheckedAt: finishedAt,
            fieldStatus: {
              probe: {
                state: 'error',
                reason: body.errorCode ?? 'PROBE_FAILED',
              },
            },
            lastIngestedAt: now,
          },
        });
      }

      return tx.agentCommand.update({
        where: { id: command.id },
        data: {
          status:
            body.status === 'SUCCEEDED'
              ? AgentCommandStatus.SUCCEEDED
              : AgentCommandStatus.FAILED,
          finishedAt,
          errorCode: body.errorCode ?? null,
          resultMetadata: body.stackSnapshot
            ? (body.stackSnapshot as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          dedupeKey: null,
        },
      });
    });
  }

  async requestDiscoveryStackRefresh(discoveryId: string, requestedBy: string) {
    const discovery = await this.prisma.websiteDiscovery.findUnique({
      where: { id: discoveryId },
      select: {
        id: true,
        domain: true,
        serverId: true,
        vpsNodeId: true,
        isPresent: true,
      },
    });
    if (!discovery || !discovery.vpsNodeId || !discovery.isPresent) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return this.createOrReturnCommand(discovery, requestedBy);
  }

  async requestWebsiteStackRefresh(websiteId: string, requestedBy: string) {
    const discovery = await this.prisma.websiteDiscovery.findFirst({
      where: { websiteId, isPresent: true },
      orderBy: { lastIngestedAt: 'desc' },
      select: {
        id: true,
        domain: true,
        serverId: true,
        vpsNodeId: true,
        isPresent: true,
      },
    });
    if (!discovery || !discovery.vpsNodeId) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return this.createOrReturnCommand(discovery, requestedBy);
  }

  async getCommand(id: string) {
    const command = await this.prisma.agentCommand.findUnique({
      where: { id },
    });
    if (!command) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return command;
  }

  private async createOrReturnCommand(
    discovery: {
      id: string;
      domain: string;
      serverId: string;
      vpsNodeId: string | null;
    },
    requestedBy: string,
  ) {
    if (!discovery.vpsNodeId) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    const dedupeKey = `${discovery.vpsNodeId}:${discovery.domain}:REFRESH_SITE_STACK`;
    const existing = await this.prisma.agentCommand.findUnique({
      where: { dedupeKey },
    });
    if (existing) return existing;

    try {
      return await this.prisma.agentCommand.create({
        data: {
          serverId: discovery.serverId,
          vpsNodeId: discovery.vpsNodeId,
          discoveryId: discovery.id,
          requestedBy,
          domain: discovery.domain,
          type: AgentCommandType.REFRESH_SITE_STACK,
          status: AgentCommandStatus.QUEUED,
          dedupeKey,
          expiresAt: new Date(Date.now() + COMMAND_TTL_MS),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.prisma.agentCommand.findUnique({
          where: { dedupeKey },
        });
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }

  private async requireUsableAgent(agentInstanceId: string) {
    const existing = await this.prisma.vpsNode.findUnique({
      where: { agentInstanceId },
      select: {
        id: true,
        serverId: true,
        credentialsRevokedAt: true,
        secretKey: true,
      },
    });
    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    if (existing.credentialsRevokedAt || !existing.secretKey) {
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }
    return existing;
  }

  private async findDiscovery(
    tx: Prisma.TransactionClient,
    serverId: string,
    domain: string,
  ) {
    return tx.websiteDiscovery.findUnique({
      where: { serverId_domain: { serverId, domain } },
      select: { id: true, websiteId: true },
    });
  }

  private async applyStackSnapshot(
    tx: Prisma.TransactionClient,
    discoveryId: string,
    snapshot: SiteStackSnapshotDto,
  ) {
    const checkedAt = new Date(snapshot.checkedAt);
    const wordpressOk = snapshot.fieldStatus.wordpressVersion?.state === 'ok';
    const phpOk = snapshot.fieldStatus.phpVersion?.state === 'ok';
    const imagickOk = snapshot.fieldStatus.imagickVersion?.state === 'ok';

    await tx.websiteDiscovery.update({
      where: { id: discoveryId },
      data: {
        ...(wordpressOk
          ? { wordpressVersion: snapshot.wordpressVersion ?? null }
          : {}),
        ...(phpOk ? { phpVersion: snapshot.phpVersion ?? null } : {}),
        ...(imagickOk
          ? { imagickVersion: snapshot.imagickVersion ?? null }
          : {}),
        fieldStatus: snapshot.fieldStatus as unknown as Prisma.InputJsonValue,
        stackCheckedAt: checkedAt,
        ...(wordpressOk || phpOk || imagickOk
          ? { stackLastSucceededAt: checkedAt }
          : {}),
        lastIngestedAt: new Date(),
      },
    });
  }
}
