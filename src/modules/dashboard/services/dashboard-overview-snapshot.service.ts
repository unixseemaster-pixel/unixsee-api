import { Injectable } from '@nestjs/common';

import { WebsiteProbeSource } from '#/generated/prisma/enums.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import { SystemHealthService } from '#/modules/health/services/system-health.service.js';
import { TrafficLoadService } from '#/modules/metrics/services/traffic-load.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class DashboardOverviewSnapshotService {
  private readonly logger = createAppLogger(DashboardOverviewSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemHealthService: SystemHealthService,
    private readonly trafficLoadService: TrafficLoadService,
  ) {}

  async getOverviewSnapshot(userId: string) {
    const [websites, vpsNodes, recentAlerts, expiringCertificates] =
      await Promise.all([
        this.prisma.website.findMany({
          where: { userId },
          orderBy: { domain: 'asc' },
          select: {
            id: true,
            vpsNodeId: true,
            domain: true,
            displayName: true,
            isActive: true,
            lastIsUp: true,
            lastStatusCode: true,
            lastResponseTimeMs: true,
            lastProbeAt: true,
            probeMetrics: {
              where: { probeSource: WebsiteProbeSource.BACKEND },
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: {
                recordedAt: true,
                probeSource: true,
                isUp: true,
                statusCode: true,
                responseTimeMs: true,
                ttfbMs: true,
                errorMessage: true,
              },
            },
            metrics: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: {
                recordedAt: true,
                concurrentRequests: true,
                requestRate: true,
                activeConnections: true,
                processingRequests: true,
                bytesInPerSecond: true,
                bytesOutPerSecond: true,
              },
            },
            sslMetrics: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: {
                recordedAt: true,
                isValid: true,
                validTo: true,
                daysRemaining: true,
                statusMessage: true,
              },
            },
            ssl: {
              select: {
                validTo: true,
                isValid: true,
                statusMessage: true,
              },
            },
          },
        }),
        this.prisma.vpsNode.findMany({
          where: {
            OR: [
              { userId },
              {
                websites: {
                  some: {
                    userId,
                  },
                },
              },
            ],
          },
          distinct: ['id'],
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            status: true,
            hostname: true,
            publicIp: true,
            lastSeenAt: true,
            vpsMetrics: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: {
                recordedAt: true,
                cpuUsagePercent: true,
                memoryTotalMB: true,
                memoryUsedMB: true,
                liteSpeedConnections: true,
                storageTotalMB: true,
                storageAvailableMB: true,
                networkRxBytesPerSecond: true,
                networkTxBytesPerSecond: true,
              },
            },
            websites: {
              where: { userId },
              select: {
                id: true,
              },
            },
            alerts: {
              where: { status: 'ACTIVE' },
              orderBy: { startedAt: 'desc' },
              take: 10,
            },
          },
        }),
        this.prisma.alert.findMany({
          where: {
            OR: [
              {
                website: {
                  userId,
                },
              },
              {
                vpsNode: {
                  OR: [
                    { userId },
                    {
                      websites: {
                        some: {
                          userId,
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        }),
        this.getOverviewExpiringCertificates(userId),
      ]);

    const uptimeSamples = await this.getRecentWebsiteUptimeSamples(
      websites.map((website) => website.id),
    );
    const uptimePercentByWebsiteId = this.calculateUptimePercentByWebsiteId(
      uptimeSamples,
    );

    const websiteCards = websites.map((website) => {
      const latestMetric = website.metrics[0] ?? null;
      const latestProbe = website.probeMetrics[0] ?? null;
      const latestSslMetric = website.sslMetrics[0] ?? null;
      const concurrentRequests = latestMetric?.concurrentRequests ?? 0;
      const requestRate = latestMetric?.requestRate ?? 0;
      const traffic = this.trafficLoadService.resolve(
        latestMetric
          ? {
              concurrentRequests,
              requestRate,
            }
          : null,
      );
      const websiteAlerts = recentAlerts.filter(
        (alert) => alert.websiteId === website.id,
      );
      const lastCheckedAt = this.latestTimestampOrNull([
        website.lastProbeAt,
        latestProbe?.recordedAt,
        latestMetric?.recordedAt,
        latestSslMetric?.recordedAt,
      ]);
      const responseTimeMs =
        latestProbe?.responseTimeMs ?? website.lastResponseTimeMs ?? null;
      const isUp = latestProbe?.isUp ?? website.lastIsUp;
      const sslStatus = this.resolveSslStatus({
        isValid: latestSslMetric?.isValid ?? website.ssl?.isValid ?? null,
        daysRemaining:
          latestSslMetric?.daysRemaining ??
          this.calculateDaysRemaining(website.ssl?.validTo ?? null),
      });
      const sslExpiresAt = latestSslMetric?.validTo ?? website.ssl?.validTo ?? null;

      return {
        id: website.id,
        websiteId: website.id,
        vpsNodeId: website.vpsNodeId,
        domain: website.domain,
        displayName: website.displayName,
        isActive: website.isActive,
        timestamp: lastCheckedAt,
        lastCheckedAt,
        status: this.systemHealthService.calculate({
          concurrentRequests,
          isUp,
          alerts: websiteAlerts.map((alert) => ({
            status: alert.severity.toLowerCase(),
          })),
        }),
        responseTimeMs,
        uptimePercent: uptimePercentByWebsiteId.get(website.id) ?? null,
        cacheHitRate: null,
        traffic,
        ssl: {
          status: sslStatus,
          expiringCount: sslStatus === 'expiring' ? 1 : 0,
          expiresAt: sslExpiresAt,
        },
        availability: {
          probeSource: WebsiteProbeSource.BACKEND,
          isUp,
          statusCode: latestProbe?.statusCode ?? website.lastStatusCode,
          responseTimeMs,
          ttfbMs: latestProbe?.ttfbMs ?? null,
          errorMessage: latestProbe?.errorMessage ?? null,
          lastProbeAt: this.latestTimestampOrNull([
            website.lastProbeAt,
            latestProbe?.recordedAt,
          ]),
        },
      };
    });

    const totalTraffic = this.trafficLoadService.resolve(
      websites.some((website) => website.metrics[0])
        ? {
            concurrentRequests: websites.reduce(
              (total, website) =>
                total + (website.metrics[0]?.concurrentRequests ?? 0),
              0,
            ),
            requestRate: websites.reduce(
              (total, website) =>
                total + (website.metrics[0]?.requestRate ?? 0),
              0,
            ),
          }
        : null,
    );

    const vpsCards = vpsNodes.map((node) => {
      const latestMetric = node.vpsMetrics[0] ?? null;
      const memoryUsagePercent = latestMetric
        ? this.calculatePercent(
            latestMetric.memoryUsedMB,
            latestMetric.memoryTotalMB,
          )
        : 0;
      const storageUsagePercent = latestMetric
        ? this.calculatePercent(
            latestMetric.storageTotalMB - latestMetric.storageAvailableMB,
            latestMetric.storageTotalMB,
          )
        : 0;
      const networkInMbps = this.bytesPerSecondToMbps(
        latestMetric?.networkRxBytesPerSecond ?? null,
      );
      const networkOutMbps = this.bytesPerSecondToMbps(
        latestMetric?.networkTxBytesPerSecond ?? null,
      );
      const lastCheckedAt = this.latestTimestampOrNull([
        latestMetric?.recordedAt,
        node.lastSeenAt,
      ]);

      return {
        id: node.id,
        vpsNodeId: node.id,
        name: node.name,
        status: this.resolveVpsOverviewStatus({
          nodeStatus: node.status,
          alerts: node.alerts,
        }),
        nodeStatus: node.status,
        hostname: node.hostname,
        publicIp: node.publicIp,
        lastCheckedAt,
        lastSeenAt: node.lastSeenAt,
        websitesCount: node.websites.length,
        activeAlertsCount: node.alerts.length,
        cpuUsagePercent: latestMetric?.cpuUsagePercent ?? null,
        memoryUsedMB: latestMetric?.memoryUsedMB ?? null,
        memoryTotalMB: latestMetric?.memoryTotalMB ?? null,
        memoryUsagePercent,
        diskUsagePercent: storageUsagePercent,
        storageUsagePercent,
        networkInMbps,
        networkOutMbps,
        metrics: latestMetric
          ? {
              recordedAt: latestMetric.recordedAt,
              cpuUsagePercent: latestMetric.cpuUsagePercent,
              memoryUsagePercent,
              memoryUsedMB: latestMetric.memoryUsedMB,
              memoryTotalMB: latestMetric.memoryTotalMB,
              diskUsagePercent: storageUsagePercent,
              storageUsagePercent,
              storageTotalMB: latestMetric.storageTotalMB,
              storageAvailableMB: latestMetric.storageAvailableMB,
              liteSpeedConnections: latestMetric.liteSpeedConnections,
              networkInMbps,
              networkOutMbps,
              networkRxBytesPerSecond: this.toNumber(
                latestMetric.networkRxBytesPerSecond,
              ),
              networkTxBytesPerSecond: this.toNumber(
                latestMetric.networkTxBytesPerSecond,
              ),
            }
          : null,
      };
    });

    const status = this.resolveGlobalOverviewStatus([
      ...websiteCards,
      ...vpsCards,
    ]);

    this.logger.debug('dashboard.overview_snapshot.loaded', {
      userId,
      status,
      websiteCount: websiteCards.length,
      vpsNodeCount: vpsCards.length,
      alertCount: recentAlerts.length,
      expiringSslCount: expiringCertificates.length,
    });

    return {
      generatedAt: new Date(),
      status,
      message: this.resolveOverviewStatusMessage(status),
      lastCheckedAt: this.latestTimestampOrNull([
        ...websiteCards.map((website) => website.lastCheckedAt),
        ...vpsCards.map((node) => node.lastCheckedAt),
      ]),
      websites: websiteCards,
      totals: {
        trafficLoad: totalTraffic.load,
        trafficActivity: totalTraffic.activity,
        averageResponseTimeMs: this.averageNullable(
          websiteCards.map((website) => website.responseTimeMs),
        ),
        averageTtfbMs: this.averageNullable(
          websites.map((website) => website.probeMetrics[0]?.ttfbMs ?? null),
        ),
        uptimePercent: this.averageNullable(
          websiteCards.map((website) => website.uptimePercent),
        ),
        websitesUp: websiteCards.filter(
          (website) => website.availability.isUp === true,
        ).length,
        websitesChecked: websiteCards.filter(
          (website) => website.availability.isUp !== null,
        ).length,
      },
      vpsNodes: vpsCards,
      alerts: recentAlerts,
      ssl: {
        expiringCount: expiringCertificates.length,
      },
      monitoring: {
        active: true,
        message: 'All monitoring systems operational',
      },
    };
  }

  async getOverviewWebsiteTick(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        userId: true,
      },
    });

    if (!website) {
      this.logger.warn('dashboard.overview_website_tick.website_not_found', {
        websiteId,
      });
      return null;
    }

    const overview = await this.getOverviewSnapshot(website.userId);
    const websiteOverview = overview.websites.find(
      (item) => item.websiteId === websiteId,
    );

    if (!websiteOverview) {
      this.logger.warn('dashboard.overview_website_tick.not_found', {
        websiteId,
        userId: website.userId,
      });
      return null;
    }

    return {
      generatedAt: overview.generatedAt,
      status: overview.status,
      lastCheckedAt: overview.lastCheckedAt,
      ssl: overview.ssl,
      website: websiteOverview,
    };
  }

  async getOverviewVpsTick(userId: string, vpsNodeId: string) {
    const overview = await this.getOverviewSnapshot(userId);
    const vpsOverview = overview.vpsNodes.find(
      (item) => item.vpsNodeId === vpsNodeId,
    );

    if (!vpsOverview) {
      this.logger.warn('dashboard.overview_vps_tick.not_found', {
        userId,
        vpsNodeId,
      });
      return null;
    }

    return {
      generatedAt: overview.generatedAt,
      status: overview.status,
      lastCheckedAt: overview.lastCheckedAt,
      vpsNode: vpsOverview,
    };
  }

  private getOverviewExpiringCertificates(userId: string, daysThreshold = 14) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);

    return this.prisma.sSLCertificate.findMany({
      where: {
        website: {
          userId,
        },
        validTo: {
          not: null,
          lte: thresholdDate,
        },
      },
      select: {
        id: true,
      },
    });
  }

  private getRecentWebsiteUptimeSamples(websiteIds: string[]) {
    if (websiteIds.length === 0) {
      return [];
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.prisma.websiteProbeMetric.findMany({
      where: {
        websiteId: { in: websiteIds },
        probeSource: WebsiteProbeSource.BACKEND,
        recordedAt: {
          gte: since,
        },
      },
      select: {
        websiteId: true,
        isUp: true,
      },
    });
  }

  private calculateUptimePercentByWebsiteId(
    samples: Array<{ websiteId: string; isUp: boolean }>,
  ) {
    const counts = new Map<string, { total: number; up: number }>();

    for (const sample of samples) {
      const current = counts.get(sample.websiteId) ?? { total: 0, up: 0 };
      current.total += 1;
      current.up += sample.isUp ? 1 : 0;
      counts.set(sample.websiteId, current);
    }

    return new Map(
      [...counts.entries()].map(([websiteId, count]) => [
        websiteId,
        count.total === 0 ? null : Math.round((count.up / count.total) * 100),
      ]),
    );
  }

  private resolveGlobalOverviewStatus(
    websites: Array<{
      status: string;
    }>,
  ) {
    if (websites.some((website) => website.status === 'critical')) {
      return 'critical';
    }

    if (websites.some((website) => website.status === 'warning')) {
      return 'warning';
    }

    if (websites.some((website) => website.status === 'monitoring')) {
      return 'monitoring';
    }

    return 'healthy';
  }

  private resolveVpsOverviewStatus({
    nodeStatus,
    alerts,
  }: {
    nodeStatus: string;
    alerts: Array<{ severity: string }>;
  }) {
    if (
      nodeStatus === 'OFFLINE' ||
      alerts.some((alert) => alert.severity === 'CRITICAL')
    ) {
      return 'critical';
    }

    if (
      nodeStatus === 'DEGRADED' ||
      alerts.some((alert) => alert.severity === 'WARNING')
    ) {
      return 'warning';
    }

    if (
      nodeStatus === 'UNKNOWN' ||
      alerts.some((alert) => alert.severity === 'MONITORING')
    ) {
      return 'monitoring';
    }

    return 'healthy';
  }

  private resolveSslStatus({
    isValid,
    daysRemaining,
  }: {
    isValid: boolean | null;
    daysRemaining: number | null;
  }) {
    if (isValid === false) return 'invalid';
    if (typeof daysRemaining === 'number' && daysRemaining <= 14) {
      return 'expiring';
    }
    if (isValid === true) return 'valid';

    return 'unknown';
  }

  private calculateDaysRemaining(validTo: Date | null) {
    if (!validTo) return null;

    return Math.ceil(
      (new Date(validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
  }

  private calculatePercent(used: number, total: number) {
    if (total <= 0) return 0;

    return Number(((used / total) * 100).toFixed(2));
  }

  private resolveOverviewStatusMessage(status: string) {
    if (status === 'healthy') return 'All systems operational';
    if (status === 'monitoring') return 'Increased activity detected';
    return 'Attention required';
  }

  private latestTimestampOrNull(
    values: Array<Date | string | null | undefined>,
  ) {
    const timestamps = values
      .filter((value): value is Date | string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value));

    if (timestamps.length === 0) {
      return null;
    }

    return new Date(Math.max(...timestamps));
  }

  private averageNullable(values: Array<number | null | undefined>) {
    const numericValues = values.filter(
      (value): value is number => typeof value === 'number',
    );

    if (numericValues.length === 0) return null;

    return Math.round(
      numericValues.reduce((total, value) => total + value, 0) /
        numericValues.length,
    );
  }

  private bytesPerSecondToMbps(value: bigint | number | null | undefined) {
    if (value === null || value === undefined) return null;

    return Number(((Number(value) * 8) / 1_000_000).toFixed(2));
  }

  private toNumber(value: bigint | number | null | undefined) {
    if (value === null || value === undefined) return null;

    return Number(value);
  }
}
