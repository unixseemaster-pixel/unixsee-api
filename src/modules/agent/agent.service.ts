import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { IngestAgentMetricsDto } from './dto/ingest-agent-metrics.dto.js';
import { PrismaService } from '../prisma/services/prisma.service.js';
import { EventDispatcherService } from '../event/event-dispatcher.service.js';

@Injectable()
export class AgentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventDispatcher: EventDispatcherService,
  ) {}

  async processTelemetryIngestion(
    payload: IngestAgentMetricsDto,
  ): Promise<string> {
    const sampleMachineId = payload.batch[0].machineId;

    const vpsTarget = await this.prisma.vpsNode.findUniqueOrThrow({
      where: { machineId: sampleMachineId },
      include: { websites: true },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const entry of payload.batch) {
        await tx.vpsMetric.create({
          data: {
            recordedAt: new Date(entry.timestamp),
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
          const matchedWebsite = vpsTarget.websites.find(
            (w) => w.domain === siteData.domain,
          );
          if (!matchedWebsite) continue;

          await tx.webMetric.create({
            data: {
              recordedAt: new Date(entry.timestamp),
              VpsNodeId: vpsTarget.id,
              websiteId: matchedWebsite.id,
              concurrentRequests: siteData.peakConcurrentRequests,
            },
          });
        }
      }
    });

    this.eventDispatcher.dispatchMetricsIngested({
      vpsNodeId: vpsTarget.id,
      batch: payload.batch,
    });

    return vpsTarget.id;
  }
}
