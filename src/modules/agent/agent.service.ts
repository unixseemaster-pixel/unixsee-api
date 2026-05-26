import { randomBytes, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { EventDispatcherService } from '../event/event-dispatcher.service.js';
import { IngestAgentMetricsDto } from './dto/ingest-agent-metrics.dto.js';

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

    await this.prisma.$transaction(async (tx) => {
      for (const entry of payload.batch) {
        const timestampDate = new Date(entry.timestamp);

        await tx.vpsMetric.create({
          data: {
            recordedAt: timestampDate,
            VpsNodeId: vpsTarget.id,
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
          let matchedWebsite = vpsTarget.websites.find(
            (w) => w.domain === siteData.domain,
          );

          if (!matchedWebsite) {
            const systemAdminUser = await tx.user.findFirstOrThrow({
              where: { role: 'ADMIN' },
            });

            matchedWebsite = await tx.website.create({
              data: {
                id: randomUUID(),
                vpsNodeId: vpsTarget.id,
                userId: vpsTarget.userId || systemAdminUser.id,
                domain: siteData.domain,
                isActive: true,
              },
            });
          }

          await tx.webMetric.create({
            data: {
              recordedAt: timestampDate,
              VpsNodeId: vpsTarget.id,
              websiteId: matchedWebsite.id,
              concurrentRequests: siteData.peakConcurrentRequests,
              requestRate: 0,
            },
          });
        }
      }
    });

    this.eventDispatcher.dispatchMetricsIngested({
      vpsNodeId: vpsTarget.id,
      batch: payload.batch,
    });

    return { vpsNodeId: vpsTarget.id };
  }
}
