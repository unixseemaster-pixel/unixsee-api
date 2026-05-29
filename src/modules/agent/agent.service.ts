import { randomBytes, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { EventDispatcherService } from '../event/event-dispatcher.service.js';
import { IngestAgentMetricsDto } from './dto/ingest-agent-metrics.dto.js';
import { WebsiteMetricsEvaluatedEvent } from '#/common/events/website-metrics-evaluated.event.js';

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventDispatcher: EventDispatcherService,
  ) {}

  async processTelemetryIngestion(
    payload: IngestAgentMetricsDto,
    isFirstProvisioningCycle: boolean,
    clientIp: string,
  ): Promise<{ vpsNodeId: string; assignedSecretKey?: string }> {
    const sampleMachineId = payload.batch[0].machineId;

    if (isFirstProvisioningCycle) {
      const existingNode = await this.prisma.vpsNode.findUnique({
        where: { machineId: sampleMachineId },
      });

      if (!existingNode) {
        const fallbackServer = await this.prisma.server.upsert({
          where: { name: `vps-host-${sampleMachineId.substring(0, 8)}` },
          update: {},
          create: {
            name: `vps-host-${sampleMachineId.substring(0, 8)}`,
            ipAddress: clientIp || '127.0.0.1',
          },
        });

        const structuralSecretKey = randomBytes(32).toString('hex');

        const newNode = await this.prisma.vpsNode.create({
          data: {
            machineId: sampleMachineId,
            serverId: fallbackServer.id,
            name: `Auto-Provisioned Node (${sampleMachineId.substring(0, 8)})`,
            secretKey: structuralSecretKey,
          },
        });

        return {
          vpsNodeId: newNode.id,
          assignedSecretKey: structuralSecretKey,
        };
      }
    }

    const vpsTarget = await this.prisma.vpsNode.findUniqueOrThrow({
      where: { machineId: sampleMachineId },
      include: { websites: true },
    });

    const websiteMap = new Map(vpsTarget.websites.map((w) => [w.domain, w]));

    const emittedEvents: WebsiteMetricsEvaluatedEvent[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const entry of payload.batch) {
        const timestampDate = new Date(entry.timestamp);

        await tx.vpsMetric.create({
          data: {
            recordedAt: timestampDate,
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
          },
        });

        for (const siteData of entry.websites) {
          let website = websiteMap.get(siteData.domain);

          if (!website) {
            const systemAdminUser = await tx.user.findFirstOrThrow({
              where: { OR: [{ role: 'ADMIN' }, { role: 'OPERATOR' }] },
            });

            website = await tx.website.create({
              data: {
                id: randomUUID(),
                vpsNodeId: vpsTarget.id,
                userId: vpsTarget.userId || systemAdminUser.id,
                domain: siteData.domain,
                isActive: true,
              },
            });

            websiteMap.set(siteData.domain, website);
          }

          await tx.webMetric.create({
            data: {
              recordedAt: timestampDate.toString(),
              vpsNodeId: vpsTarget.id,
              websiteId: website.id,
              concurrentRequests: siteData.peakConcurrentRequests,
              requestRate: 0,
            },
          });

          emittedEvents.push({
            vpsNodeId: vpsTarget.id,
            websiteId: website.id,
            domain: siteData.domain,
            metrics: {
              concurrentRequests: siteData.peakConcurrentRequests,
            },
            // concurrentRequests: siteData.peakConcurrentRequests,
            timestamp: timestampDate?.toString(),
          });
        }
      }
    });

    for (const event of emittedEvents) {
      this.eventDispatcher.dispatchWebsiteMetricsEvaluated(event);
    }

    return { vpsNodeId: vpsTarget.id };
  }
}
