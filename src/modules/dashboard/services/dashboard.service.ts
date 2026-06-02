import { Injectable } from '@nestjs/common';

import { AlertsService } from '#/modules/alerts/services/alerts.service.js';
import { SystemHealthService } from '#/modules/health/services/system-health.service.js';
import { MetricsOverviewService } from '#/modules/metrics/services/metrics-overview.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { SslCertificatesService } from '#/modules/ssl-certificates/services/ssl-certificates.service.js';
import { WebsitesService } from '#/modules/websites/services/websites.service.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly metricsOverviewService: MetricsOverviewService,
    private readonly alertsService: AlertsService,
    private readonly websitesService: WebsitesService,
    private readonly sslCertificatesService: SslCertificatesService,
    private readonly systemHealthService: SystemHealthService,
    private readonly prisma: PrismaService,
  ) {}

  async getOverview(userId: string) {
    const [metricsOverview, recentAlerts, expiringCertificates] =
      await Promise.all([
        this.metricsOverviewService.getOverview(userId),
        this.alertsService.getRecentAlerts(userId),
        this.websitesService.getUserWebsites(userId),
        this.sslCertificatesService.getExpiringCertificates(userId),
      ]);

    const websiteAlertsMap = new Map<string, typeof recentAlerts>();

    for (const alert of recentAlerts) {
      if (!alert.websiteId) return;

      const existing = websiteAlertsMap.get(alert.websiteId) ?? [];
      websiteAlertsMap.set(alert.websiteId, [...existing, alert]);
    }

    const websitesView = metricsOverview.websites.map((website) => {
      const websiteAlerts = websiteAlertsMap.get(website.websiteId) ?? [];

      return {
        websiteId: website.websiteId,
        activeVisitors: website.activeVisitors,
        requestRate: website.requestRate,
        lastCheckedAt: website.lastCheckedAt,

        status: this.systemHealthService.calculate({
          activeVisitors: website.activeVisitors,
          alerts: websiteAlerts,
        }),

        trafficStatus: this.resolveTrafficLabel(website.activeVisitors),
      };
    });

    return {
      status: metricsOverview.status,

      message: this.resolveStatusMessage(metricsOverview.status),

      lastCheckedAt: this.getLatestTimestamp(
        websitesView
          .filter((w) => Boolean(w.lastCheckedAt))
          .map((w) => ({ lastCheckedAt: w.lastCheckedAt as Date })),
      ),

      websites: websitesView,

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

  async getMonitoring(userId: string) {
    const trafficSince = new Date(Date.now() - 1000 * 60 * 60 * 24);

    const websites = await this.prisma.website.findMany({
      where: {
        userId,
      },
      orderBy: {
        domain: 'asc',
      },
      select: {
        id: true,
        domain: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        metrics: {
          where: {
            recordedAt: {
              gte: trafficSince,
            },
          },
          orderBy: {
            recordedAt: 'asc',
          },
          select: {
            recordedAt: true,
            concurrentRequests: true,
            requestRate: true,
          },
        },
        ssl: {
          select: {
            id: true,
            issuer: true,
            subject: true,
            validFrom: true,
            validTo: true,
            isValid: true,
            serialNumber: true,
            isAutoRenewable: true,
            statusMessage: true,
          },
        },
        alerts: {
          orderBy: {
            startedAt: 'desc',
          },
          take: 10,
          select: {
            id: true,
            title: true,
            message: true,
            severity: true,
            status: true,
            startedAt: true,
            resolvedAt: true,
            metadata: true,
          },
        },
        vpsNode: {
          select: {
            id: true,
            name: true,
            machineId: true,
            server: {
              select: {
                id: true,
                name: true,
                ipAddress: true,
              },
            },
            vpsMetrics: {
              orderBy: {
                recordedAt: 'desc',
              },
              take: 1,
              select: {
                recordedAt: true,
                cpuUsagePercent: true,
                memoryTotalMB: true,
                memoryUsedMB: true,
                liteSpeedConnections: true,
                diskReadBytesPerSecond: true,
                diskWriteBytesPerSecond: true,
                diskIops: true,
                storageTotalMB: true,
                storageAvailableMB: true,
                networkRxBytesPerSecond: true,
                networkTxBytesPerSecond: true,
              },
            },
          },
        },
      },
    });

    const latestMetrics = await this.prisma.webMetric.findMany({
      where: {
        websiteId: {
          in: websites.map((website) => website.id),
        },
      },
      distinct: ['websiteId'],
      orderBy: [
        {
          websiteId: 'asc',
        },
        {
          recordedAt: 'desc',
        },
      ],
      select: {
        websiteId: true,
        recordedAt: true,
        concurrentRequests: true,
        requestRate: true,
      },
    });

    const latestMetricsMap = new Map(
      latestMetrics.map((metric) => [metric.websiteId, metric]),
    );

    const websitesView = websites.map((website) => {
      const latestWebMetric = latestMetricsMap.get(website.id) ?? null;
      const latestVpsMetric = website.vpsNode.vpsMetrics[0] ?? null;
      const activeAlerts = website.alerts.filter(
        (alert) => alert.status === 'ACTIVE',
      );
      const activeVisitors = latestWebMetric?.concurrentRequests ?? 0;
      const status = this.resolveMonitoringStatus({
        activeVisitors,
        alerts: activeAlerts,
        sslIsValid: website.ssl?.isValid ?? null,
      });

      return {
        websiteId: website.id,
        domain: website.domain,
        isActive: website.isActive,
        status,
        trafficStatus: this.resolveTrafficLabel(activeVisitors),
        lastCheckedAt: latestWebMetric?.recordedAt ?? null,
        createdAt: website.createdAt,
        updatedAt: website.updatedAt,

        traffic: {
          activeVisitors,
          requestRate: latestWebMetric?.requestRate ?? 0,
          samples: website.metrics.map((metric) => ({
            recordedAt: metric.recordedAt,
            activeVisitors: metric.concurrentRequests,
            requestRate: metric.requestRate,
          })),
        },

        ssl: website.ssl
          ? {
              ...website.ssl,
              daysRemaining: this.calculateDaysRemaining(website.ssl.validTo),
            }
          : null,

        alerts: {
          activeCount: activeAlerts.length,
          active: activeAlerts,
          recent: website.alerts,
        },

        infrastructure: {
          vpsNode: {
            id: website.vpsNode.id,
            name: website.vpsNode.name,
            machineId: website.vpsNode.machineId,
            server: website.vpsNode.server,
            latestMetrics: latestVpsMetric
              ? {
                  recordedAt: latestVpsMetric.recordedAt,
                  cpuUsagePercent: latestVpsMetric.cpuUsagePercent,
                  memory: {
                    totalMB: latestVpsMetric.memoryTotalMB,
                    usedMB: latestVpsMetric.memoryUsedMB,
                    usagePercent: this.calculatePercent(
                      latestVpsMetric.memoryUsedMB,
                      latestVpsMetric.memoryTotalMB,
                    ),
                  },
                  liteSpeedConnections: latestVpsMetric.liteSpeedConnections,
                  disk: {
                    readBytesPerSecond: Number(
                      latestVpsMetric.diskReadBytesPerSecond,
                    ),
                    writeBytesPerSecond: Number(
                      latestVpsMetric.diskWriteBytesPerSecond,
                    ),
                    iops: latestVpsMetric.diskIops,
                  },
                  storage: {
                    totalMB: latestVpsMetric.storageTotalMB,
                    availableMB: latestVpsMetric.storageAvailableMB,
                    usedPercent: this.calculatePercent(
                      latestVpsMetric.storageTotalMB -
                        latestVpsMetric.storageAvailableMB,
                      latestVpsMetric.storageTotalMB,
                    ),
                  },
                  network: {
                    rxBytesPerSecond: Number(
                      latestVpsMetric.networkRxBytesPerSecond,
                    ),
                    txBytesPerSecond: Number(
                      latestVpsMetric.networkTxBytesPerSecond,
                    ),
                  },
                }
              : null,
          },
        },
      };
    });

    return {
      status: this.resolveGlobalMonitoringStatus(websitesView),
      generatedAt: new Date(),
      range: {
        trafficSince,
      },
      totals: {
        websites: websitesView.length,
        activeWebsites: websitesView.filter((website) => website.isActive)
          .length,
        activeAlerts: websitesView.reduce(
          (total, website) => total + website.alerts.activeCount,
          0,
        ),
      },
      websites: websitesView,
    };
  }

  private resolveStatusMessage(status: string) {
    if (status === 'healthy') return 'All systems operational';
    if (status === 'monitoring') return 'Increased activity detected';
    return 'Attention required';
  }

  private resolveTrafficLabel(activeVisitors: number) {
    if (activeVisitors > 500) return 'high';
    if (activeVisitors > 200) return 'medium';
    return 'normal';
  }

  private getLatestTimestamp(
    websites: Array<{ lastCheckedAt: Date | string }>,
  ): Date {
    if (websites.length === 0) {
      return new Date(0);
    }

    let latestTimestamp = new Date(websites[0].lastCheckedAt).getTime();

    for (let i = 1; i < websites.length; i++) {
      const currentTimestamp = new Date(websites[i].lastCheckedAt).getTime();

      if (currentTimestamp > latestTimestamp) {
        latestTimestamp = currentTimestamp;
      }
    }

    return new Date(latestTimestamp);
  }

  private resolveMonitoringStatus({
    activeVisitors,
    alerts,
    sslIsValid,
  }: {
    activeVisitors: number;
    alerts: Array<{ severity: string }>;
    sslIsValid: boolean | null;
  }) {
    if (
      alerts.some((alert) => alert.severity === 'CRITICAL') ||
      sslIsValid === false
    ) {
      return 'critical';
    }

    if (alerts.some((alert) => alert.severity === 'WARNING')) {
      return 'warning';
    }

    if (
      alerts.some((alert) => alert.severity === 'MONITORING') ||
      activeVisitors > 500
    ) {
      return 'monitoring';
    }

    return 'healthy';
  }

  private resolveGlobalMonitoringStatus(
    websites: Array<{ status: string }>,
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
}
