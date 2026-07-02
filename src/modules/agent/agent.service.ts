import { randomBytes, randomUUID } from 'crypto';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { EventDispatcherService } from '../event/event-dispatcher.service.js';
import {
  IngestAgentMetricsDto,
  WebsitePayloadDto,
} from './dto/ingest-agent-metrics.dto.js';
import { WebsiteMetricsEvaluatedEvent } from '#/common/events/website-metrics-evaluated.event.js';
import type { Website } from '#/generated/prisma/client.js';
import { WebsiteProbeSource } from '#/generated/prisma/enums.js';

type WebsiteProbeMetricRow = {
  recordedAt: Date;
  websiteId: string;
  probeSource: typeof WebsiteProbeSource.AGENT;
  isUp: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  ttfbMs: number | null;
  errorMessage: string | null;
};

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventDispatcher: EventDispatcherService,
  ) {}

  async processTelemetryIngestion(
    payload: IngestAgentMetricsDto,
    isFirstProvisioningCycle: boolean,
    clientIp: string,
  ): Promise<{ vpsNodeId: string; assignedSecretKey?: string }> {
    const startedAt = Date.now();
    const sampleMachineId = payload.batch[0].machineId;

    try {
      if (isFirstProvisioningCycle) {
        const provisioningResult = await this.provisionNodeIfMissing(
          sampleMachineId,
          clientIp,
        );

        if (provisioningResult) {
          this.logger.log(
            `Agent node provisioned | machine=${sampleMachineId} | vpsNode=${provisioningResult.vpsNodeId}`,
          );
          return provisioningResult;
        }
      }

      const vpsTarget = await this.prisma.vpsNode.findUniqueOrThrow({
        where: { machineId: sampleMachineId },
        include: { websites: true },
      });

      const websiteMap = await this.ensureWebsites(
        vpsTarget.id,
        vpsTarget.userId,
        vpsTarget.websites,
        this.getUniqueWebsitePayloads(payload),
      );

      const vpsMetricResult = await this.prisma.vpsMetric.createMany({
        data: payload.batch.map((entry) => ({
          recordedAt: new Date(entry.timestamp),
          vpsNodeId: vpsTarget.id,
          cpuUsagePercent: entry.metrics.cpuMean,
          memoryTotalMB: entry.metrics.ramTotalMB,
          memoryUsedMB: entry.metrics.ramMeanMB,
          liteSpeedConnections: entry.metrics.lsConnectionsPeak,
          diskReadBytesPerSecond: BigInt(
            entry.metrics.diskReadBytesPerSecondMean,
          ),
          diskWriteBytesPerSecond: BigInt(
            entry.metrics.diskWriteBytesPerSecondMean,
          ),
          diskIops: entry.metrics.diskIopsMean,
          storageTotalMB: entry.metrics.storageTotalMB,
          storageAvailableMB: entry.metrics.storageAvailableMB,
          networkRxBytesPerSecond: BigInt(0),
          networkTxBytesPerSecond: BigInt(0),
        })),
        skipDuplicates: true,
      });

      const webMetricRows = this.buildWebMetricRows(
        payload,
        vpsTarget.id,
        websiteMap,
      );

      const webMetricResult = webMetricRows.length
        ? await this.prisma.webMetric.createMany({
            data: webMetricRows,
            skipDuplicates: true,
          })
        : { count: 0 };

      const probeMetricRows = this.buildWebsiteProbeMetricRows(
        payload,
        websiteMap,
      );

      const probeMetricResult = probeMetricRows.length
        ? await this.prisma.websiteProbeMetric.createMany({
            data: probeMetricRows,
            skipDuplicates: true,
          })
        : { count: 0 };

      await this.refreshLatestWebsiteProbes(probeMetricRows);

      this.dispatchRealtimeEvents(payload, vpsTarget.id, websiteMap);

      this.logger.log(
        `Agent ingest stored | machine=${sampleMachineId} | batch=${payload.batch.length} | vpsInserted=${vpsMetricResult.count} | webInserted=${webMetricResult.count} | probeInserted=${probeMetricResult.count} | webRows=${webMetricRows.length} | probeRows=${probeMetricRows.length} | durationMs=${Date.now() - startedAt}`,
      );

      return { vpsNodeId: vpsTarget.id };
    } catch (error) {
      this.logger.error(
        `Agent ingest failed | machine=${sampleMachineId} | batch=${payload.batch.length} | durationMs=${Date.now() - startedAt} | ${this.formatError(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

  private async provisionNodeIfMissing(
    machineId: string,
    clientIp: string,
  ): Promise<{ vpsNodeId: string; assignedSecretKey: string } | null> {
    const existingNode = await this.prisma.vpsNode.findUnique({
      where: { machineId },
    });

    if (existingNode) return null;

    const fallbackServer = await this.prisma.server.upsert({
      where: { name: `vps-host-${machineId.substring(0, 8)}` },
      update: {},
      create: {
        name: `vps-host-${machineId.substring(0, 8)}`,
        ipAddress: clientIp || '127.0.0.1',
      },
    });

    const structuralSecretKey = randomBytes(32).toString('hex');

    const newNode = await this.prisma.vpsNode.create({
      data: {
        machineId,
        serverId: fallbackServer.id,
        name: `Auto-Provisioned Node (${machineId.substring(0, 8)})`,
        secretKey: structuralSecretKey,
      },
    });

    return {
      vpsNodeId: newNode.id,
      assignedSecretKey: structuralSecretKey,
    };
  }

  private getUniqueWebsitePayloads(
    payload: IngestAgentMetricsDto,
  ): WebsitePayloadDto[] {
    const websiteMap = new Map<string, WebsitePayloadDto>();

    for (const entry of payload.batch) {
      for (const website of entry.websites) {
        websiteMap.set(website.domain, website);
      }
    }

    return [...websiteMap.values()];
  }

  private async ensureWebsites(
    vpsNodeId: string,
    vpsNodeUserId: string | null,
    currentWebsites: Website[],
    discoveredWebsites: WebsitePayloadDto[],
  ): Promise<Map<string, Website>> {
    const websiteMap = new Map(
      currentWebsites.map((website) => [website.domain, website]),
    );
    const missingWebsites = discoveredWebsites.filter(
      (website) => !websiteMap.has(website.domain),
    );

    if (missingWebsites.length === 0) {
      await this.refreshWebsiteInventory(vpsNodeId, discoveredWebsites);

      const refreshedWebsites = await this.prisma.website.findMany({
        where: {
          domain: { in: discoveredWebsites.map((website) => website.domain) },
        },
      });

      return new Map(
        refreshedWebsites.map((website) => [website.domain, website]),
      );
    }

    const fallbackUserId = vpsNodeUserId ?? (await this.getFallbackUserId());

    await this.prisma.website.createMany({
      data: missingWebsites.map((website) => ({
        id: randomUUID(),
        vpsNodeId,
        userId: fallbackUserId,
        domain: website.domain,
        directAdminUser: website.owner,
        documentRoot: website.documentRoot,
        homeDirectory: this.getHomeDirectory(website.documentRoot),
        isActive: true,
      })),
      skipDuplicates: true,
    });

    await this.refreshWebsiteInventory(vpsNodeId, discoveredWebsites);

    const refreshedWebsites = await this.prisma.website.findMany({
      where: {
        domain: { in: discoveredWebsites.map((website) => website.domain) },
      },
    });

    return new Map(
      refreshedWebsites.map((website) => [website.domain, website]),
    );
  }

  private async refreshWebsiteInventory(
    vpsNodeId: string,
    discoveredWebsites: WebsitePayloadDto[],
  ): Promise<void> {
    await Promise.all(
      discoveredWebsites.map((website) =>
        this.prisma.website.updateMany({
          where: { domain: website.domain },
          data: {
            vpsNodeId,
            directAdminUser: website.owner,
            documentRoot: website.documentRoot,
            homeDirectory: this.getHomeDirectory(website.documentRoot),
            isActive: true,
          },
        }),
      ),
    );
  }

  private async getFallbackUserId(): Promise<string> {
    const systemAdminUser = await this.prisma.user.findFirst({
      where: { OR: [{ role: 'ADMIN' }, { role: 'OPERATOR' }] },
      select: { id: true },
    });

    if (!systemAdminUser) {
      throw new InternalServerErrorException(
        'Cannot auto-create discovered websites because no ADMIN or OPERATOR user exists.',
      );
    }

    return systemAdminUser.id;
  }

  private buildWebMetricRows(
    payload: IngestAgentMetricsDto,
    vpsNodeId: string,
    websiteMap: Map<string, Website>,
  ) {
    return payload.batch.flatMap((entry) => {
      const recordedAt = new Date(entry.timestamp);

      return entry.websites.flatMap((siteData) => {
        const website = websiteMap.get(siteData.domain);

        if (!website) return [];

        return {
          recordedAt,
          vpsNodeId,
          websiteId: website.id,
          concurrentRequests: siteData.peakConcurrentRequests,
          requestRate: 0,
        };
      });
    });
  }

  private buildWebsiteProbeMetricRows(
    payload: IngestAgentMetricsDto,
    websiteMap: Map<string, Website>,
  ): WebsiteProbeMetricRow[] {
    return payload.batch.flatMap((entry) => {
      const recordedAt = new Date(entry.timestamp);

      return entry.websites.flatMap((siteData) => {
        const website = websiteMap.get(siteData.domain);

        if (!website || !siteData.probe) return [];

        return {
          recordedAt,
          websiteId: website.id,
          probeSource: WebsiteProbeSource.AGENT,
          isUp: Boolean(siteData.probe.isUp),
          statusCode: this.normalizeNullableInteger(siteData.probe.statusCode),
          responseTimeMs: this.normalizeNullableInteger(
            siteData.probe.responseTimeMs,
          ),
          ttfbMs: this.normalizeNullableInteger(siteData.probe.ttfbMs),
          errorMessage: this.normalizeNullableText(siteData.probe.errorMessage),
        };
      });
    });
  }

  private async refreshLatestWebsiteProbes(
    probeRows: WebsiteProbeMetricRow[],
  ): Promise<void> {
    const latestProbeByWebsite = new Map<string, (typeof probeRows)[number]>();

    for (const row of probeRows) {
      const existing = latestProbeByWebsite.get(row.websiteId);

      if (!existing || row.recordedAt > existing.recordedAt) {
        latestProbeByWebsite.set(row.websiteId, row);
      }
    }

    await Promise.all(
      [...latestProbeByWebsite.values()].map((row) =>
        this.prisma.website.update({
          where: { id: row.websiteId },
          data: {
            lastIsUp: row.isUp,
            lastStatusCode: row.statusCode,
            lastResponseTimeMs: row.responseTimeMs,
            lastProbeAt: row.recordedAt,
          },
        }),
      ),
    );
  }

  private dispatchRealtimeEvents(
    payload: IngestAgentMetricsDto,
    vpsNodeId: string,
    websiteMap: Map<string, Website>,
  ): void {
    const emittedEvents: WebsiteMetricsEvaluatedEvent[] = [];

    this.eventDispatcher.dispatchMetricsIngested({
      vpsNodeId,
      batch: payload.batch,
    });

    for (const entry of payload.batch) {
      for (const siteData of entry.websites) {
        const website = websiteMap.get(siteData.domain);

        if (!website) continue;

        emittedEvents.push({
          vpsNodeId,
          websiteId: website.id,
          domain: siteData.domain,
          metrics: {
            concurrentRequests: siteData.peakConcurrentRequests,
            requestRate: 0,
          },
          probe: siteData.probe
            ? {
                isUp: Boolean(siteData.probe.isUp),
                statusCode: this.normalizeNullableInteger(
                  siteData.probe.statusCode,
                ),
                responseTimeMs: this.normalizeNullableInteger(
                  siteData.probe.responseTimeMs,
                ),
                ttfbMs: this.normalizeNullableInteger(siteData.probe.ttfbMs),
                errorMessage: this.normalizeNullableText(
                  siteData.probe.errorMessage,
                ),
              }
            : null,
          timestamp: new Date(entry.timestamp).toISOString(),
        });
      }
    }

    for (const event of emittedEvents) {
      this.eventDispatcher.dispatchWebsiteMetricsEvaluated(event);
    }
  }

  private getHomeDirectory(documentRoot: string): string | null {
    const match = documentRoot.match(/^(\/home\/[^/]+)/);
    return match?.[1] ?? null;
  }

  private normalizeNullableInteger(
    value: number | null | undefined,
  ): number | null {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.round(value))
      : null;
  }

  private normalizeNullableText(
    value: string | null | undefined,
  ): string | null {
    if (typeof value !== 'string') return null;

    const normalized = value.trim();
    return normalized.length > 0 ? normalized.slice(0, 240) : null;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return String(error);
  }
}
