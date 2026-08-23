import { createHash, randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createAppLogger } from '#/common/logging/app-logger.js';
import {
  EnrollmentTokenStatus,
  VpsNodeStatus,
} from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import type { AppConfigType } from '#/utils/config/app.config.js';

const AGENT_CONNECTED_MS = 2 * 60 * 1000;
const AGENT_STALE_MS = 10 * 60 * 1000;

@Injectable()
export class ServersService {
  private readonly logger = createAppLogger(ServersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfigType>,
  ) {}

  async list(params?: { skip?: number; take?: number }) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.server.findMany({
        include: {
          _count: { select: { vpsNodes: true, enrollmentTokens: true } },
          vpsNodes: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              agentInstanceId: true,
              agentVersion: true,
              lastHeartbeatAt: true,
              lastSeenAt: true,
              status: true,
              credentialsRevokedAt: true,
            },
          },
          enrollmentTokens: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              createdAt: true,
              expiresAt: true,
              usedAt: true,
              revokedAt: true,
            },
          },
          discoveries: {
            orderBy: { updatedAt: 'desc' },
            take: 20,
            include: { trafficSnapshot: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.server.count(),
    ]);

    return {
      items: items.map((server) => this.toAdminServerReadModel(server)),
      total,
    };
  }

  async get(id: string) {
    const server = await this.prisma.server.findUnique({
      where: { id },
      include: {
        vpsNodes: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            agentInstanceId: true,
            agentVersion: true,
            lastHeartbeatAt: true,
            lastSeenAt: true,
            status: true,
            credentialsRevokedAt: true,
            credentialsRevokedReason: true,
          },
        },
        enrollmentTokens: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
            expiresAt: true,
            usedAt: true,
            revokedAt: true,
          },
        },
        discoveries: {
          orderBy: { updatedAt: 'desc' },
          include: { trafficSnapshot: true },
        },
      },
    });
    if (!server) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return this.toAdminServerReadModel(server);
  }

  async create(input: {
    name: string;
    ipAddress: string;
    notes?: string;
    controlPanelUrl?: string;
  }) {
    const server = await this.prisma.server.create({ data: input });
    this.logger.log('server.created', {
      serverId: server.id,
      name: server.name,
    });
    return server;
  }

  async update(
    id: string,
    data: {
      name?: string;
      ipAddress?: string;
      notes?: string | null;
      controlPanelUrl?: string | null;
    },
  ) {
    await this.ensureServer(id);
    const server = await this.prisma.server.update({ where: { id }, data });
    this.logger.log('server.updated', { serverId: id });
    return server;
  }

  async delete(id: string) {
    await this.ensureServer(id);

    const boundWebsiteCount = await this.prisma.website.count({
      where: { vpsNode: { serverId: id } },
    });
    if (boundWebsiteCount > 0) {
      throw new ConflictException(ERROR_MESSAGES.fa.conflict);
    }

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const revokedTokens = await tx.serverEnrollmentToken.updateMany({
        where: {
          serverId: id,
          status: EnrollmentTokenStatus.ACTIVE,
        },
        data: {
          status: EnrollmentTokenStatus.REVOKED,
          revokedAt: now,
        },
      });

      const disabledNodes = await tx.vpsNode.updateMany({
        where: { serverId: id },
        data: {
          secretKey: '',
          status: VpsNodeStatus.OFFLINE,
          credentialsRevokedAt: now,
          credentialsRevokedReason: 'server.deleted',
        },
      });

      await tx.server.delete({ where: { id } });

      return {
        revokedTokenCount: revokedTokens.count,
        disabledNodeCount: disabledNodes.count,
      };
    });

    this.logger.log('server.deleted', {
      serverId: id,
      revokedTokenCount: result.revokedTokenCount,
      disabledNodeCount: result.disabledNodeCount,
    });

    return {
      id,
      revokedTokenCount: result.revokedTokenCount,
      disabledNodeCount: result.disabledNodeCount,
    };
  }

  async createEnrollmentToken(
    serverId: string,
    input?: { expiresAt?: string },
  ) {
    await this.ensureServer(serverId);

    const plaintext = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(plaintext).digest('hex');

    const token = await this.prisma.serverEnrollmentToken.create({
      data: {
        serverId,
        tokenHash,
        status: EnrollmentTokenStatus.ACTIVE,
        expiresAt: input?.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    this.logger.log('server.enrollment_token.created', {
      serverId,
      tokenId: token.id,
    });

    return {
      id: token.id,
      serverId: token.serverId,
      status: token.status,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      token: plaintext,
      installCommand: this.buildInstallCommand(plaintext),
    };
  }

  async revokeEnrollmentToken(serverId: string, tokenId: string) {
    const token = await this.prisma.serverEnrollmentToken.findFirst({
      where: { id: tokenId, serverId },
    });
    if (!token) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    if (token.status !== EnrollmentTokenStatus.ACTIVE) {
      throw new ConflictException(ERROR_MESSAGES.fa.conflict);
    }

    const updated = await this.prisma.serverEnrollmentToken.update({
      where: { id: tokenId },
      data: {
        status: EnrollmentTokenStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    this.logger.log('server.enrollment_token.revoked', {
      serverId,
      tokenId,
    });
    return updated;
  }

  async revokeAgentCredentials(serverId: string, reason: string) {
    await this.ensureServer(serverId);
    if (!reason?.trim()) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    const nodes = await this.prisma.vpsNode.findMany({
      where: { serverId },
      select: { id: true },
    });
    if (nodes.length === 0) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const now = new Date();
    await this.prisma.vpsNode.updateMany({
      where: { serverId },
      data: {
        secretKey: '',
        status: VpsNodeStatus.OFFLINE,
        credentialsRevokedAt: now,
        credentialsRevokedReason: reason.trim(),
      },
    });

    this.logger.log('server.agent.credentials_revoked', {
      serverId,
      nodeCount: nodes.length,
    });

    return {
      serverId,
      revokedAt: now,
      reason: reason.trim(),
      vpsNodeIds: nodes.map((node) => node.id),
    };
  }

  async enrollWithToken(
    plaintextToken: string,
    agentInstanceId: string,
    agentVersion?: string,
  ) {
    if (!plaintextToken?.trim() || !agentInstanceId?.trim()) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    const tokenHash = createHash('sha256').update(plaintextToken).digest('hex');
    const token = await this.prisma.serverEnrollmentToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        serverId: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!token || token.status !== EnrollmentTokenStatus.ACTIVE) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    const secretKey = randomBytes(32).toString('hex');
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.vpsNode.findUnique({
        where: { agentInstanceId },
        select: { id: true, serverId: true },
      });

      // Same generic 400 as invalid tokens — do not reveal cross-server binding via 409.
      if (existing && existing.serverId !== token.serverId) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }

      const consumed = await tx.serverEnrollmentToken.updateMany({
        where: {
          id: token.id,
          status: EnrollmentTokenStatus.ACTIVE,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: {
          status: EnrollmentTokenStatus.USED,
          usedAt: now,
        },
      });

      if (consumed.count !== 1) {
        if (token.expiresAt && token.expiresAt.getTime() <= now.getTime()) {
          await tx.serverEnrollmentToken.updateMany({
            where: {
              id: token.id,
              status: EnrollmentTokenStatus.ACTIVE,
            },
            data: { status: EnrollmentTokenStatus.EXPIRED },
          });
        }
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }

      const vpsNode = existing
        ? await tx.vpsNode.update({
            where: { agentInstanceId },
            data: {
              secretKey,
              lastSeenAt: now,
              lastHeartbeatAt: now,
              status: VpsNodeStatus.ONLINE,
              credentialsRevokedAt: null,
              credentialsRevokedReason: null,
              ...(agentVersion ? { agentVersion } : {}),
            },
          })
        : await tx.vpsNode.create({
            data: {
              agentInstanceId,
              serverId: token.serverId,
              name: `Node ${agentInstanceId.substring(0, 8)}`,
              secretKey,
              lastSeenAt: now,
              lastHeartbeatAt: now,
              status: VpsNodeStatus.ONLINE,
              ...(agentVersion ? { agentVersion } : {}),
            },
          });

      return vpsNode;
    });

    this.logger.log('server.enrollment.completed', {
      serverId: token.serverId,
      vpsNodeId: result.id,
      agentInstanceId,
      tokenId: token.id,
    });

    return {
      vpsNodeId: result.id,
      serverId: token.serverId,
      secretKey,
    };
  }

  private async ensureServer(id: string) {
    const server = await this.prisma.server.findUnique({ where: { id } });
    if (!server) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return server;
  }

  private buildInstallCommand(token: string): string {
    const apiBaseUrl = this.configService.getOrThrow('app.agentApiBaseUrl', {
      infer: true,
    });
    return `curl -fsSL https://panel.unixsee.com/agents/install.sh | sudo bash -s -- --token ${token} --api-base-url ${apiBaseUrl}`;
  }

  private toAdminServerReadModel(server: {
    id: string;
    name: string;
    ipAddress: string;
    notes: string | null;
    controlPanelUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    vpsNodes: Array<{
      id: string;
      agentInstanceId: string;
      agentVersion: string | null;
      lastHeartbeatAt: Date | null;
      lastSeenAt: Date | null;
      status: VpsNodeStatus;
      credentialsRevokedAt: Date | null;
      credentialsRevokedReason?: string | null;
    }>;
    enrollmentTokens: Array<{
      id: string;
      status: EnrollmentTokenStatus;
      createdAt: Date;
      expiresAt: Date | null;
      usedAt: Date | null;
      revokedAt: Date | null;
    }>;
    discoveries: unknown[];
  }) {
    const latestNode = server.vpsNodes[0] ?? null;
    const latestToken = server.enrollmentTokens[0] ?? null;

    return {
      id: server.id,
      name: server.name,
      label: server.name,
      ipAddress: server.ipAddress,
      notes: server.notes,
      controlPanelUrl: server.controlPanelUrl,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      agent: this.deriveAgentState(latestNode, latestToken),
      enrollment: this.deriveEnrollmentState(latestToken),
      discoveries: server.discoveries,
      vpsNodes: server.vpsNodes.map((node) => ({
        id: node.id,
        agentInstanceId: node.agentInstanceId,
        agentVersion: node.agentVersion,
        lastHeartbeatAt: node.lastHeartbeatAt,
        lastSeenAt: node.lastSeenAt,
        status: node.status,
        credentialsRevokedAt: node.credentialsRevokedAt,
      })),
      enrollmentTokens: server.enrollmentTokens.map((token) => ({
        id: token.id,
        status: token.status,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        usedAt: token.usedAt,
        revokedAt: token.revokedAt,
      })),
    };
  }

  private deriveAgentState(
    node: {
      agentVersion: string | null;
      lastHeartbeatAt: Date | null;
      credentialsRevokedAt: Date | null;
    } | null,
    token: { status: EnrollmentTokenStatus } | null,
  ) {
    if (node?.credentialsRevokedAt) {
      return {
        state: 'DISCONNECTED' as const,
        version: node.agentVersion ?? undefined,
        lastSeenAt: undefined,
        dataFreshness: 'STALE' as const,
      };
    }

    if (node?.lastHeartbeatAt) {
      const ageMs = Date.now() - node.lastHeartbeatAt.getTime();
      if (ageMs <= AGENT_CONNECTED_MS) {
        return {
          state: 'CONNECTED' as const,
          version: node.agentVersion ?? undefined,
          lastSeenAt: node.lastHeartbeatAt.toISOString(),
          dataFreshness: 'UP_TO_DATE' as const,
        };
      }
      if (ageMs <= AGENT_STALE_MS) {
        return {
          state: 'STALE' as const,
          version: node.agentVersion ?? undefined,
          lastSeenAt: node.lastHeartbeatAt.toISOString(),
          dataFreshness: 'STALE' as const,
        };
      }
      return {
        state: 'DISCONNECTED' as const,
        version: node.agentVersion ?? undefined,
        lastSeenAt: node.lastHeartbeatAt.toISOString(),
        dataFreshness: 'STALE' as const,
      };
    }

    if (token?.status === EnrollmentTokenStatus.ACTIVE) {
      return { state: 'ENROLLMENT_ISSUED' as const };
    }

    return { state: 'PENDING_AGENT' as const };
  }

  private deriveEnrollmentState(
    token: {
      status: EnrollmentTokenStatus;
      createdAt: Date;
      expiresAt: Date | null;
    } | null,
  ) {
    if (!token) {
      return { status: 'NONE' as const };
    }

    const statusMap = {
      [EnrollmentTokenStatus.ACTIVE]: 'UNUSED',
      [EnrollmentTokenStatus.USED]: 'USED',
      [EnrollmentTokenStatus.EXPIRED]: 'EXPIRED',
      [EnrollmentTokenStatus.REVOKED]: 'REVOKED',
    } as const;

    return {
      status: statusMap[token.status],
      issuedAt: token.createdAt.toISOString(),
      expiresAt: token.expiresAt?.toISOString(),
    };
  }
}
