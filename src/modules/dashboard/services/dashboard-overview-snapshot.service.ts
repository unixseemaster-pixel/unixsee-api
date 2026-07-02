import { Injectable } from '@nestjs/common';

import { WebsiteProbeSource } from '#/generated/prisma/enums.js';
import { SystemHealthService } from '#/modules/health/services/system-health.service.js';
import { TrafficLoadService } from '#/modules/metrics/services/traffic-load.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class DashboardOverviewSnapshotService {
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
              },
            },
            sslMetrics: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: {
                recordedAt: true,
                isValid: true,
                daysRemaining: true,
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

      return {
        websiteId: website.id,
        vpsNodeId: website.vpsNodeId,
        domain: website.domain,
        displayName: website.displayName,
        isActive: website.isActive,
        lastCheckedAt: this.latestTimestampOrNull([
          website.lastProbeAt,
          latestProbe?.recordedAt,
          latestMetric?.recordedAt,
          latestSslMetric?.recordedAt,
        ]),
        status: this.systemHealthService.calculate({
          concurrentRequests,
          isUp: website.lastIsUp,
          alerts: websiteAlerts.map((alert) => ({
            status: alert.severity.toLowerCase(),
          })),
        }),
        traffic,
        availability: {
          probeSource: WebsiteProbeSource.BACKEND,
          isUp: website.lastIsUp,
          statusCode: website.lastStatusCode,
          responseTimeMs: website.lastResponseTimeMs,
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

      return {
        vpsNodeId: node.id,
        name: node.name,
        status: this.resolveVpsOverviewStatus({
          nodeStatus: node.status,
          alerts: node.alerts,
        }),
        nodeStatus: node.status,
        hostname: node.hostname,
        publicIp: node.publicIp,
        lastCheckedAt: this.latestTimestampOrNull([
          latestMetric?.recordedAt,
          node.lastSeenAt,
        ]),
        lastSeenAt: node.lastSeenAt,
        websitesCount: node.websites.length,
        activeAlertsCount: node.alerts.length,
        metrics: latestMetric
          ? {
              recordedAt: latestMetric.recordedAt,
              cpuUsagePercent: latestMetric.cpuUsagePercent,
              memoryUsagePercent,
              memoryUsedMB: latestMetric.memoryUsedMB,
              memoryTotalMB: latestMetric.memoryTotalMB,
              storageUsagePercent,
              storageTotalMB: latestMetric.storageTotalMB,
              storageAvailableMB: latestMetric.storageAvailableMB,
              liteSpeedConnections: latestMetric.liteSpeedConnections,
            }
          : null,
      };
    });

    const status = this.resolveGlobalOverviewStatus([
      ...websiteCards,
      ...vpsCards,
    ]);

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
          websites.map((website) => website.lastResponseTimeMs),
        ),
        averageTtfbMs: this.averageNullable(
          websites.map((website) => website.probeMetrics[0]?.ttfbMs ?? null),
        ),
        uptimePercent: this.calculateUptimePercent(
          websites.map((website) => website.lastIsUp),
        ),
        websitesUp: websites.filter((website) => website.lastIsUp === true)
          .length,
        websitesChecked: websites.filter((website) => website.lastIsUp !== null)
          .length,
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
      return null;
    }

    const overview = await this.getOverviewSnapshot(website.userId);
    const websiteOverview = overview.websites.find(
      (item) => item.websiteId === websiteId,
    );

    if (!websiteOverview) {
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

  private calculateUptimePercent(values: Array<boolean | null>) {
    const checked = values.filter((value): value is boolean => value !== null);

    if (checked.length === 0) return null;

    return Math.round(
      (checked.filter((value) => value).length / checked.length) * 100,
    );
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
}
