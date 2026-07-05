import { randomBytes, randomUUID } from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { EventDispatcherService } from '../event/event-dispatcher.service.js';
import {
  IngestAgentMetricsDto,
  WebsitePayloadDto,
} from './dto/ingest-agent-metrics.dto.js';
import { WebsiteMetricsEvaluatedEvent } from '#/common/events/website-metrics-evaluated.event.js';
import type { Website } from '#/generated/prisma/client.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class AgentService {
  private readonly logger = createAppLogger(AgentService.name);

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
          this.logger.log('agent.node.provisioned', {
            machineId: sampleMachineId,
            vpsNodeId: provisioningResult.vpsNodeId,
          });
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
          cpuCoreCount: entry.metrics.cpuCoreCount ?? null,
          load1: entry.metrics.load1 ?? null,
          load5: entry.metrics.load5 ?? null,
          load15: entry.metrics.load15 ?? null,
          memoryTotalMB: entry.metrics.ramTotalMB,
          memoryUsedMB: entry.metrics.ramMeanMB,
          memoryAvailableMB: entry.metrics.ramAvailableMB ?? null,
          swapTotalMB: entry.metrics.swapTotalMB ?? null,
          swapUsedMB: entry.metrics.swapUsedMB ?? null,
          processCount: entry.metrics.processCount ?? null,
          uptimeSeconds: this.toBigIntOrNull(entry.metrics.uptimeSeconds),
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
          networkRxBytesPerSecond: BigInt(
            Math.round(entry.metrics.networkRxBytesPerSecondMean ?? 0),
          ),
          networkTxBytesPerSecond: BigInt(
            Math.round(entry.metrics.networkTxBytesPerSecondMean ?? 0),
          ),
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

      this.dispatchRealtimeEvents(payload, vpsTarget.id, websiteMap);

      this.logger.log('agent.ingest.stored', {
        machineId: sampleMachineId,
        batchSize: payload.batch.length,
        vpsInserted: vpsMetricResult.count,
        webInserted: webMetricResult.count,
        webRows: webMetricRows.length,
        durationMs: Date.now() - startedAt,
      });

      return { vpsNodeId: vpsTarget.id };
    } catch (error) {
      this.logger.error('agent.ingest.failed', error as Error, {
        machineId: sampleMachineId,
        batchSize: payload.batch.length,
        durationMs: Date.now() - startedAt,
      });

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
      this.logger.debug('agent.websites.inventory.refresh', {
        vpsNodeId,
        discoveredCount: discoveredWebsites.length,
        missingCount: 0,
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

    const fallbackUserId = vpsNodeUserId ?? (await this.getFallbackUserId());

    this.logger.log('agent.websites.discovered', {
      vpsNodeId,
      discoveredCount: discoveredWebsites.length,
      missingCount: missingWebsites.length,
    });

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
          requestRate: siteData.requestRate ?? 0,
          activeConnections: siteData.activeConnections ?? null,
          processingRequests: siteData.processingRequests ?? null,
          bytesInPerSecond: this.toBigIntOrNull(siteData.bytesInPerSecond),
          bytesOutPerSecond: this.toBigIntOrNull(siteData.bytesOutPerSecond),
        };
      });
    });
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
            requestRate: siteData.requestRate ?? 0,
            activeConnections: siteData.activeConnections ?? null,
            processingRequests: siteData.processingRequests ?? null,
            bytesInPerSecond: siteData.bytesInPerSecond ?? null,
            bytesOutPerSecond: siteData.bytesOutPerSecond ?? null,
          },
          timestamp: new Date(entry.timestamp).toISOString(),
        });
      }
    }

    for (const event of emittedEvents) {
      this.eventDispatcher.dispatchWebsiteMetricsEvaluated(event);
    }

    this.logger.debug('agent.realtime.events.dispatched', {
      vpsNodeId,
      batchSize: payload.batch.length,
      websiteEventCount: emittedEvents.length,
    });
  }

  private toBigIntOrNull(value: number | null | undefined): bigint | null {
    if (value === null || value === undefined) return null;

    return BigInt(Math.round(value));
  }

  private getHomeDirectory(documentRoot: string): string | null {
    const match = documentRoot.match(/^(\/home\/[^/]+)/);
    return match?.[1] ?? null;
  }
}
