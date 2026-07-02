import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { TrafficLoadService } from '#/modules/metrics/services/traffic-load.service.js';

import type { TrafficLoadType } from '#/modules/metrics/types/traffic-load.type.js';

export type DashboardChartsRange = '24h' | '7d' | '30d';
export type DashboardChartsInterval = 'auto' | '5m' | '15m' | '1h' | '1d';

type ResolvedChartRange = {
  from: Date;
  to: Date;
  range: DashboardChartsRange;
  interval: Exclude<DashboardChartsInterval, 'auto'>;
  intervalMs: number;
  bucketStarts: Date[];
};

type WebMetricSample = {
  recordedAt: Date;
  websiteId: string;
  concurrentRequests: number;
  requestRate: number;
};

type ProbeMetricSample = {
  recordedAt: Date;
  websiteId: string;
  isUp: boolean;
  responseTimeMs: number | null;
  ttfbMs: number | null;
};

type VpsMetricSample = {
  recordedAt: Date;
  vpsNodeId: string;
  cpuUsagePercent: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  liteSpeedConnections: number;
  diskReadBytesPerSecond: bigint;
  diskWriteBytesPerSecond: bigint;
  diskIops: number;
  storageTotalMB: number;
  storageAvailableMB: number;
  networkRxBytesPerSecond: bigint;
  networkTxBytesPerSecond: bigint;
};

type WebsiteChartTarget = {
  id: string;
  domain: string;
};

type VpsChartTarget = {
  id: string;
  name: string;
};

type TrafficBucket = {
  bucketStart: Date;
  requestRate: number;
  peakConcurrentRequests: number;
  trafficLoad: TrafficLoadType;
};

type PerformanceBucket = {
  bucketStart: Date;
  avgResponseTimeMs: number | null;
  avgTtfbMs: number | null;
  uptimePercent: number | null;
};

type ResourceBucket = {
  bucketStart: Date;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  storageUsagePercent: number;
  liteSpeedConnections: number;
};

type NetworkBucket = {
  bucketStart: Date;
  rxBytesPerSecond: number;
  txBytesPerSecond: number;
};

type DiskIoBucket = {
  bucketStart: Date;
  readBytesPerSecond: number;
  writeBytesPerSecond: number;
  iops: number;
};

@Injectable()
export class DashboardChartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trafficLoadService: TrafficLoadService,
  ) {}

  async getOverviewCharts(
    userId: string,
    rangeInput?: string,
    intervalInput?: string,
  ) {
    const range = this.resolveRange(rangeInput, intervalInput);
    const [websites, vpsNodes, activeAlerts] = await Promise.all([
      this.getUserWebsites(userId),
      this.getUserVpsNodes(userId),
      this.countActiveAlerts(userId),
    ]);

    const [webMetrics, probeMetrics, vpsMetrics] = await Promise.all([
      this.getWebMetrics(
        websites.map((website) => website.id),
        range,
      ),
      this.getProbeMetrics(
        websites.map((website) => website.id),
        range,
      ),
      this.getVpsMetrics(
        vpsNodes.map((node) => node.id),
        range,
      ),
    ]);

    const websiteCharts = websites.map((website) =>
      this.buildWebsiteCharts(website, range, webMetrics, probeMetrics),
    );
    const vpsCharts = vpsNodes.map((node) =>
      this.buildVpsCharts(node, range, vpsMetrics),
    );

    return {
      generatedAt: new Date(),
      range: this.mapRangeResponse(range),
      websites: websiteCharts,
      vpsNodes: vpsCharts,
      summary: this.buildSummary(websiteCharts, vpsCharts, activeAlerts),
    };
  }

  async getWebsiteCharts(
    userId: string,
    websiteId: string,
    rangeInput?: string,
    intervalInput?: string,
  ) {
    const range = this.resolveRange(rangeInput, intervalInput);
    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,
        userId,
      },
      select: {
        id: true,
        domain: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    const [webMetrics, probeMetrics] = await Promise.all([
      this.getWebMetrics([website.id], range),
      this.getProbeMetrics([website.id], range),
    ]);

    return {
      generatedAt: new Date(),
      range: this.mapRangeResponse(range),
      website: this.buildWebsiteCharts(
        website,
        range,
        webMetrics,
        probeMetrics,
      ),
    };
  }

  async getVpsCharts(
    userId: string,
    vpsNodeId: string,
    rangeInput?: string,
    intervalInput?: string,
  ) {
    const range = this.resolveRange(rangeInput, intervalInput);
    const vpsNode = await this.prisma.vpsNode.findFirst({
      where: {
        id: vpsNodeId,
        OR: [{ userId }, { websites: { some: { userId } } }],
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!vpsNode) {
      throw new NotFoundException('VPS node not found');
    }

    const vpsMetrics = await this.getVpsMetrics([vpsNode.id], range);

    return {
      generatedAt: new Date(),
      range: this.mapRangeResponse(range),
      vpsNode: this.buildVpsCharts(vpsNode, range, vpsMetrics),
    };
  }

  private resolveRange(
    rangeInput?: string,
    intervalInput?: string,
  ): ResolvedChartRange {
    const range = this.isRange(rangeInput) ? rangeInput : '24h';
    const interval =
      this.isInterval(intervalInput) && intervalInput !== 'auto'
        ? intervalInput
        : this.resolveAutoInterval(range);
    const to = new Date();
    const from = new Date(to.getTime() - this.rangeToMs(range));
    const intervalMs = this.intervalToMs(interval);
    const bucketStarts: Date[] = [];

    for (
      let timestamp = from.getTime();
      timestamp < to.getTime();
      timestamp += intervalMs
    ) {
      bucketStarts.push(new Date(timestamp));
    }

    return {
      from,
      to,
      range,
      interval,
      intervalMs,
      bucketStarts,
    };
  }

  private isRange(value: string | undefined): value is DashboardChartsRange {
    return value === '24h' || value === '7d' || value === '30d';
  }

  private isInterval(
    value: string | undefined,
  ): value is DashboardChartsInterval {
    return (
      value === 'auto' ||
      value === '5m' ||
      value === '15m' ||
      value === '1h' ||
      value === '1d'
    );
  }

  private resolveAutoInterval(
    range: DashboardChartsRange,
  ): Exclude<DashboardChartsInterval, 'auto'> {
    if (range === '24h') return '15m';
    if (range === '7d') return '1h';
    return '1d';
  }

  private rangeToMs(range: DashboardChartsRange) {
    if (range === '24h') return 24 * 60 * 60 * 1000;
    if (range === '7d') return 7 * 24 * 60 * 60 * 1000;
    return 30 * 24 * 60 * 60 * 1000;
  }

  private intervalToMs(interval: Exclude<DashboardChartsInterval, 'auto'>) {
    if (interval === '5m') return 5 * 60 * 1000;
    if (interval === '15m') return 15 * 60 * 1000;
    if (interval === '1h') return 60 * 60 * 1000;
    return 24 * 60 * 60 * 1000;
  }

  private mapRangeResponse(range: ResolvedChartRange) {
    return {
      from: range.from,
      to: range.to,
      range: range.range,
      interval: range.interval,
    };
  }

  private getUserWebsites(userId: string) {
    return this.prisma.website.findMany({
      where: { userId },
      orderBy: { domain: 'asc' },
      select: {
        id: true,
        domain: true,
      },
    });
  }

  private getUserVpsNodes(userId: string) {
    return this.prisma.vpsNode.findMany({
      where: {
        OR: [{ userId }, { websites: { some: { userId } } }],
      },
      distinct: ['id'],
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });
  }

  private getWebMetrics(websiteIds: string[], range: ResolvedChartRange) {
    if (websiteIds.length === 0) {
      return [];
    }

    return this.prisma.webMetric.findMany({
      where: {
        websiteId: { in: websiteIds },
        recordedAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      orderBy: { recordedAt: 'asc' },
      select: {
        recordedAt: true,
        websiteId: true,
        concurrentRequests: true,
        requestRate: true,
      },
    });
  }

  private getProbeMetrics(websiteIds: string[], range: ResolvedChartRange) {
    if (websiteIds.length === 0) {
      return [];
    }

    return this.prisma.websiteProbeMetric.findMany({
      where: {
        websiteId: { in: websiteIds },
        recordedAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      orderBy: { recordedAt: 'asc' },
      select: {
        recordedAt: true,
        websiteId: true,
        isUp: true,
        responseTimeMs: true,
        ttfbMs: true,
      },
    });
  }

  private getVpsMetrics(vpsNodeIds: string[], range: ResolvedChartRange) {
    if (vpsNodeIds.length === 0) {
      return [];
    }

    return this.prisma.vpsMetric.findMany({
      where: {
        vpsNodeId: { in: vpsNodeIds },
        recordedAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      orderBy: { recordedAt: 'asc' },
      select: {
        recordedAt: true,
        vpsNodeId: true,
        cpuUsagePercent: true,
        memoryUsedMB: true,
        memoryTotalMB: true,
        liteSpeedConnections: true,
        diskReadBytesPerSecond: true,
        diskWriteBytesPerSecond: true,
        diskIops: true,
        storageTotalMB: true,
        storageAvailableMB: true,
        networkRxBytesPerSecond: true,
        networkTxBytesPerSecond: true,
      },
    });
  }

  private countActiveAlerts(userId: string) {
    return this.prisma.alert.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { website: { userId } },
          {
            vpsNode: {
              OR: [{ userId }, { websites: { some: { userId } } }],
            },
          },
        ],
      },
    });
  }

  private buildWebsiteCharts(
    website: WebsiteChartTarget,
    range: ResolvedChartRange,
    webMetrics: WebMetricSample[],
    probeMetrics: ProbeMetricSample[],
  ) {
    const websiteWebMetrics = webMetrics.filter(
      (metric) => metric.websiteId === website.id,
    );
    const websiteProbeMetrics = probeMetrics.filter(
      (metric) => metric.websiteId === website.id,
    );

    return {
      websiteId: website.id,
      domain: website.domain,
      traffic: this.buildTrafficSeries(range, websiteWebMetrics),
      performance: this.buildPerformanceSeries(range, websiteProbeMetrics),
    };
  }

  private buildVpsCharts(
    vpsNode: VpsChartTarget,
    range: ResolvedChartRange,
    vpsMetrics: VpsMetricSample[],
  ) {
    const nodeMetrics = vpsMetrics.filter(
      (metric) => metric.vpsNodeId === vpsNode.id,
    );

    return {
      vpsNodeId: vpsNode.id,
      name: vpsNode.name,
      resources: this.buildResourceSeries(range, nodeMetrics),
      network: this.buildNetworkSeries(range, nodeMetrics),
      diskIo: this.buildDiskIoSeries(range, nodeMetrics),
    };
  }

  private buildTrafficSeries(
    range: ResolvedChartRange,
    samples: WebMetricSample[],
  ): TrafficBucket[] {
    return range.bucketStarts.map((bucketStart) => {
      const bucketSamples = this.filterBucket(samples, bucketStart, range);
      const requestRate = this.round(
        this.average(bucketSamples.map((sample) => sample.requestRate)),
      );
      const peakConcurrentRequests = this.max(
        bucketSamples.map((sample) => sample.concurrentRequests),
      );
      const trafficLoad = this.trafficLoadService.resolve(
        bucketSamples.length === 0
          ? null
          : {
              concurrentRequests: peakConcurrentRequests,
              requestRate,
            },
      ).load;

      return {
        bucketStart,
        requestRate,
        peakConcurrentRequests,
        trafficLoad,
      };
    });
  }

  private buildPerformanceSeries(
    range: ResolvedChartRange,
    samples: ProbeMetricSample[],
  ): PerformanceBucket[] {
    return range.bucketStarts.map((bucketStart) => {
      const bucketSamples = this.filterBucket(samples, bucketStart, range);
      const responseTimes = bucketSamples
        .map((sample) => sample.responseTimeMs)
        .filter((value): value is number => value !== null);
      const ttfbTimes = bucketSamples
        .map((sample) => sample.ttfbMs)
        .filter((value): value is number => value !== null);

      return {
        bucketStart,
        avgResponseTimeMs: this.nullableAverage(responseTimes),
        avgTtfbMs: this.nullableAverage(ttfbTimes),
        uptimePercent:
          bucketSamples.length === 0
            ? null
            : this.round(
                (bucketSamples.filter((sample) => sample.isUp).length /
                  bucketSamples.length) *
                  100,
              ),
      };
    });
  }

  private buildResourceSeries(
    range: ResolvedChartRange,
    samples: VpsMetricSample[],
  ): ResourceBucket[] {
    return range.bucketStarts.map((bucketStart) => {
      const bucketSamples = this.filterBucket(samples, bucketStart, range);

      return {
        bucketStart,
        cpuUsagePercent: this.round(
          this.average(bucketSamples.map((sample) => sample.cpuUsagePercent)),
        ),
        memoryUsagePercent: this.round(
          this.average(
            bucketSamples.map((sample) =>
              this.calculatePercent(sample.memoryUsedMB, sample.memoryTotalMB),
            ),
          ),
        ),
        storageUsagePercent: this.round(
          this.average(
            bucketSamples.map((sample) =>
              this.calculatePercent(
                sample.storageTotalMB - sample.storageAvailableMB,
                sample.storageTotalMB,
              ),
            ),
          ),
        ),
        liteSpeedConnections: this.round(
          this.average(
            bucketSamples.map((sample) => sample.liteSpeedConnections),
          ),
        ),
      };
    });
  }

  private buildNetworkSeries(
    range: ResolvedChartRange,
    samples: VpsMetricSample[],
  ): NetworkBucket[] {
    return range.bucketStarts.map((bucketStart) => {
      const bucketSamples = this.filterBucket(samples, bucketStart, range);

      return {
        bucketStart,
        rxBytesPerSecond: this.round(
          this.average(
            bucketSamples.map((sample) =>
              this.toNumber(sample.networkRxBytesPerSecond),
            ),
          ),
        ),
        txBytesPerSecond: this.round(
          this.average(
            bucketSamples.map((sample) =>
              this.toNumber(sample.networkTxBytesPerSecond),
            ),
          ),
        ),
      };
    });
  }

  private buildDiskIoSeries(
    range: ResolvedChartRange,
    samples: VpsMetricSample[],
  ): DiskIoBucket[] {
    return range.bucketStarts.map((bucketStart) => {
      const bucketSamples = this.filterBucket(samples, bucketStart, range);

      return {
        bucketStart,
        readBytesPerSecond: this.round(
          this.average(
            bucketSamples.map((sample) =>
              this.toNumber(sample.diskReadBytesPerSecond),
            ),
          ),
        ),
        writeBytesPerSecond: this.round(
          this.average(
            bucketSamples.map((sample) =>
              this.toNumber(sample.diskWriteBytesPerSecond),
            ),
          ),
        ),
        iops: this.round(
          this.average(bucketSamples.map((sample) => sample.diskIops)),
        ),
      };
    });
  }

  private buildSummary(
    websites: Array<{
      traffic: TrafficBucket[];
      performance: PerformanceBucket[];
    }>,
    vpsNodes: Array<{
      resources: ResourceBucket[];
    }>,
    activeAlerts: number,
  ) {
    const trafficBuckets = websites.flatMap((website) => website.traffic);
    const resourceBuckets = vpsNodes.flatMap((node) => node.resources);
    const performanceBuckets = websites.flatMap(
      (website) => website.performance,
    );
    const responseTimes = performanceBuckets
      .map((bucket) => bucket.avgResponseTimeMs)
      .filter((value): value is number => value !== null);
    const uptimeValues = performanceBuckets
      .map((bucket) => bucket.uptimePercent)
      .filter((value): value is number => value !== null);
    const peakConcurrentRequests = this.max(
      trafficBuckets.map((bucket) => bucket.peakConcurrentRequests),
    );
    const requestRate = this.round(
      this.average(trafficBuckets.map((bucket) => bucket.requestRate)),
    );
    const trafficLoad = this.trafficLoadService.resolve(
      trafficBuckets.length === 0
        ? null
        : {
            concurrentRequests: peakConcurrentRequests,
            requestRate,
          },
    ).load;

    return {
      trafficLoad,
      averageCpuUsagePercent: this.round(
        this.average(resourceBuckets.map((bucket) => bucket.cpuUsagePercent)),
      ),
      averageMemoryUsagePercent: this.round(
        this.average(
          resourceBuckets.map((bucket) => bucket.memoryUsagePercent),
        ),
      ),
      averageResponseTimeMs: this.nullableAverage(responseTimes),
      uptimePercent: this.nullableAverage(uptimeValues),
      activeAlerts,
    };
  }

  private filterBucket<T extends { recordedAt: Date }>(
    samples: T[],
    bucketStart: Date,
    range: ResolvedChartRange,
  ) {
    const bucketStartMs = bucketStart.getTime();
    const bucketEndMs = Math.min(
      bucketStartMs + range.intervalMs,
      range.to.getTime(),
    );

    return samples.filter((sample) => {
      const sampleTime = sample.recordedAt.getTime();
      return sampleTime >= bucketStartMs && sampleTime < bucketEndMs;
    });
  }

  private average(values: number[]) {
    if (values.length === 0) return 0;

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private nullableAverage(values: number[]) {
    if (values.length === 0) return null;

    return this.round(this.average(values));
  }

  private max(values: number[]) {
    if (values.length === 0) return 0;

    return Math.max(...values);
  }

  private calculatePercent(used: number, total: number) {
    if (total <= 0) return 0;

    return (used / total) * 100;
  }

  private round(value: number) {
    return Number(value.toFixed(2));
  }

  private toNumber(value: bigint) {
    return Number(value);
  }
}
