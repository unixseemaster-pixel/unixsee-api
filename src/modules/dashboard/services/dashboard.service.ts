import { Injectable, Logger } from '@nestjs/common';

import { AlertsService } from '#/modules/alerts/services/alerts.service.js';
import { SystemHealthService } from '#/modules/health/services/system-health.service.js';
import { MetricsOverviewService } from '#/modules/metrics/services/metrics-overview.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { SslCertificatesService } from '#/modules/ssl-certificates/services/ssl-certificates.service.js';
import { WebsitesService } from '#/modules/websites/services/websites.service.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly metricsOverviewService: MetricsOverviewService,
    private readonly alertsService: AlertsService,
    private readonly websitesService: WebsitesService,
    private readonly sslCertificatesService: SslCertificatesService,
    private readonly systemHealthService: SystemHealthService,
    private readonly prisma: PrismaService,
  ) {}

  async getOverview(userId: string) {
    this.logger.log(`Dashboard overview request started, userId: ${userId}`);

    const logOverviewDependency = async <T>(
      label: string,
      promise: Promise<T>,
    ): Promise<T> => {
      this.logger.log(`Dashboard overview loading ${label}, userId: ${userId}`);

      try {
        const result = await promise;
        const count = Array.isArray(result) ? result.length : 'object';
        this.logger.log(
          `Dashboard overview loaded ${label}, userId: ${userId}, result: ${count}`,
        );
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Dashboard overview failed loading ${label}, userId: ${userId}, error: ${message}`,
          stack,
        );
        throw error;
      }
    };

    const [metricsOverview, recentAlerts, expiringCertificates] =
      await Promise.all([
        logOverviewDependency(
          'metrics overview',
          this.metricsOverviewService.getOverview(userId),
        ),
        logOverviewDependency(
          'recent alerts',
          this.alertsService.getRecentAlerts(userId),
        ),
        logOverviewDependency(
          'user websites',
          this.websitesService.getUserWebsites(userId),
        ),
        logOverviewDependency(
          'expiring certificates',
          this.sslCertificatesService.getExpiringCertificates(userId),
        ),
      ]);

    this.logger.log(
      `Dashboard overview dependencies loaded, userId: ${userId}, overviewWebsites: ${metricsOverview.websites.length}, alerts: ${recentAlerts.length}, thirdResultCount: ${expiringCertificates.length}`,
    );

    const websiteAlertsMap = new Map<string, typeof recentAlerts>();

    for (const alert of recentAlerts) {
      if (!alert.websiteId) {
        this.logger.warn(
          `Dashboard overview alert without websiteId, userId: ${userId}, alertId: ${alert.id}`,
        );
        return;
      }

      const existing = websiteAlertsMap.get(alert.websiteId) ?? [];
      websiteAlertsMap.set(alert.websiteId, [...existing, alert]);
    }

    this.logger.log(
      `Dashboard overview alert map built, userId: ${userId}, websiteAlertGroups: ${websiteAlertsMap.size}`,
    );

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

    this.logger.log(
      `Dashboard overview websites view built, userId: ${userId}, websites: ${websitesView.length}`,
    );

    const overview = {
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

    this.logger.log(
      `Dashboard overview response ready, userId: ${userId}, status: ${overview.status}`,
    );

    return overview;
  }

  async getMonitoring(userId: string) {
    const monitoringSince = new Date(Date.now() - 1000 * 60 * 60 * 24);

    const [websites, vpsNodes] = await Promise.all([
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
          createdAt: true,
          updatedAt: true,
          metrics: {
            where: { recordedAt: { gte: monitoringSince } },
            orderBy: { recordedAt: 'asc' },
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
          probeMetrics: {
            where: { recordedAt: { gte: monitoringSince } },
            orderBy: { recordedAt: 'asc' },
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
          sslMetrics: {
            where: { recordedAt: { gte: monitoringSince } },
            orderBy: { recordedAt: 'asc' },
            select: {
              recordedAt: true,
              isValid: true,
              daysRemaining: true,
              statusMessage: true,
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
            orderBy: { startedAt: 'desc' },
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
        },
      }),
      this.prisma.vpsNode.findMany({
        where: {
          OR: [{ userId }, { websites: { some: { userId } } }],
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          machineId: true,
          status: true,
          hostname: true,
          publicIp: true,
          osName: true,
          osVersion: true,
          kernelVersion: true,
          agentVersion: true,
          lastSeenAt: true,
          server: {
            select: {
              id: true,
              name: true,
              ipAddress: true,
            },
          },
          alerts: {
            orderBy: { startedAt: 'desc' },
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
          vpsMetrics: {
            where: { recordedAt: { gte: monitoringSince } },
            orderBy: { recordedAt: 'asc' },
            select: {
              recordedAt: true,
              cpuUsagePercent: true,
              cpuCoreCount: true,
              load1: true,
              load5: true,
              load15: true,
              memoryTotalMB: true,
              memoryUsedMB: true,
              memoryAvailableMB: true,
              swapTotalMB: true,
              swapUsedMB: true,
              processCount: true,
              uptimeSeconds: true,
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
          filesystemMetrics: {
            where: { recordedAt: { gte: monitoringSince } },
            orderBy: { recordedAt: 'asc' },
            select: {
              recordedAt: true,
              mountPoint: true,
              filesystem: true,
              totalMB: true,
              usedMB: true,
              availableMB: true,
              usagePercent: true,
            },
          },
          networkInterfaceMetrics: {
            where: { recordedAt: { gte: monitoringSince } },
            orderBy: { recordedAt: 'asc' },
            select: {
              recordedAt: true,
              interfaceName: true,
              rxBytesPerSecond: true,
              txBytesPerSecond: true,
              rxPacketsPerSecond: true,
              txPacketsPerSecond: true,
              rxErrors: true,
              txErrors: true,
              rxDrops: true,
              txDrops: true,
            },
          },
          serviceMetrics: {
            where: { recordedAt: { gte: monitoringSince } },
            orderBy: { recordedAt: 'asc' },
            select: {
              recordedAt: true,
              serviceName: true,
              isActive: true,
              status: true,
              memoryMB: true,
            },
          },
        },
      }),
    ]);

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
      const activeAlerts = website.alerts.filter(
        (alert) => alert.status === 'ACTIVE',
      );
      const activeVisitors = latestWebMetric?.concurrentRequests ?? 0;
      const status = this.resolveMonitoringStatus({
        activeVisitors,
        alerts: activeAlerts,
        sslIsValid: website.ssl?.isValid ?? null,
        isUp: website.lastIsUp,
      });

      return {
        websiteId: website.id,
        vpsNodeId: website.vpsNodeId,
        domain: website.domain,
        displayName: website.displayName,
        isActive: website.isActive,
        status,
        trafficStatus: this.resolveTrafficLabel(activeVisitors),
        lastCheckedAt:
          website.lastProbeAt ?? latestWebMetric?.recordedAt ?? null,
        createdAt: website.createdAt,
        updatedAt: website.updatedAt,

        availability: {
          isUp: website.lastIsUp,
          statusCode: website.lastStatusCode,
          responseTimeMs: website.lastResponseTimeMs,
          lastProbeAt: website.lastProbeAt,
          samples: website.probeMetrics,
        },

        traffic: {
          activeVisitors,
          requestRate: latestWebMetric?.requestRate ?? 0,
          samples: website.metrics.map((metric) => ({
            recordedAt: metric.recordedAt,
            activeVisitors: metric.concurrentRequests,
            requestRate: metric.requestRate,
            activeConnections: metric.activeConnections,
            processingRequests: metric.processingRequests,
            bytesInPerSecond: this.toNumber(metric.bytesInPerSecond),
            bytesOutPerSecond: this.toNumber(metric.bytesOutPerSecond),
          })),
        },

        ssl: website.ssl
          ? {
              ...website.ssl,
              daysRemaining: this.calculateDaysRemaining(website.ssl.validTo),
              samples: website.sslMetrics,
            }
          : null,

        alerts: {
          activeCount: activeAlerts.length,
          active: activeAlerts,
          recent: website.alerts,
        },
      };
    });

    const nodesView = vpsNodes.map((node) => {
      const latestMetric = node.vpsMetrics.at(-1) ?? null;
      const activeAlerts = node.alerts.filter(
        (alert) => alert.status === 'ACTIVE',
      );

      return {
        id: node.id,
        name: node.name,
        machineId: node.machineId,
        status: node.status,
        hostname: node.hostname,
        publicIp: node.publicIp,
        operatingSystem: {
          name: node.osName,
          version: node.osVersion,
          kernelVersion: node.kernelVersion,
        },
        agent: {
          version: node.agentVersion,
          lastSeenAt: node.lastSeenAt,
        },
        server: node.server,
        latestMetrics: latestMetric ? this.mapVpsMetric(latestMetric) : null,
        charts: {
          system: node.vpsMetrics.map((metric) => ({
            recordedAt: metric.recordedAt,
            cpuUsagePercent: metric.cpuUsagePercent,
            load1: metric.load1,
            load5: metric.load5,
            load15: metric.load15,
            processCount: metric.processCount,
            liteSpeedConnections: metric.liteSpeedConnections,
          })),
          memory: node.vpsMetrics.map((metric) => ({
            recordedAt: metric.recordedAt,
            usedMB: metric.memoryUsedMB,
            availableMB: metric.memoryAvailableMB,
            usagePercent: this.calculatePercent(
              metric.memoryUsedMB,
              metric.memoryTotalMB,
            ),
            swapUsedMB: metric.swapUsedMB,
            swapTotalMB: metric.swapTotalMB,
          })),
          diskIo: node.vpsMetrics.map((metric) => ({
            recordedAt: metric.recordedAt,
            readBytesPerSecond: this.toNumber(metric.diskReadBytesPerSecond),
            writeBytesPerSecond: this.toNumber(metric.diskWriteBytesPerSecond),
            iops: metric.diskIops,
          })),
          network: node.vpsMetrics.map((metric) => ({
            recordedAt: metric.recordedAt,
            rxBytesPerSecond: this.toNumber(metric.networkRxBytesPerSecond),
            txBytesPerSecond: this.toNumber(metric.networkTxBytesPerSecond),
          })),
        },
        filesystems: this.groupBy(
          node.filesystemMetrics,
          (metric) => metric.mountPoint,
        ).map(([mountPoint, samples]) => ({
          mountPoint,
          latest: samples.at(-1),
          samples,
        })),
        networkInterfaces: this.groupBy(
          node.networkInterfaceMetrics,
          (metric) => metric.interfaceName,
        ).map(([interfaceName, metrics]) => {
          const samples = metrics.map((metric) => ({
            ...metric,
            rxBytesPerSecond: this.toNumber(metric.rxBytesPerSecond),
            txBytesPerSecond: this.toNumber(metric.txBytesPerSecond),
            rxPacketsPerSecond: this.toNumber(metric.rxPacketsPerSecond),
            txPacketsPerSecond: this.toNumber(metric.txPacketsPerSecond),
          }));

          return {
            interfaceName,
            latest: samples.at(-1),
            samples,
          };
        }),
        services: this.groupBy(
          node.serviceMetrics,
          (metric) => metric.serviceName,
        ).map(([serviceName, samples]) => ({
          serviceName,
          latest: samples.at(-1),
          samples,
        })),
        alerts: {
          activeCount: activeAlerts.length,
          active: activeAlerts,
          recent: node.alerts,
        },
      };
    });

    return {
      status: this.resolveGlobalMonitoringStatus(websitesView, nodesView),
      generatedAt: new Date(),
      range: {
        since: monitoringSince,
        durationHours: 24,
      },
      totals: {
        websites: websitesView.length,
        activeWebsites: websitesView.filter((website) => website.isActive)
          .length,
        onlineNodes: nodesView.filter((node) => node.status === 'ONLINE')
          .length,
        nodes: nodesView.length,
        activeAlerts:
          websitesView.reduce(
            (total, website) => total + website.alerts.activeCount,
            0,
          ) +
          nodesView.reduce((total, node) => total + node.alerts.activeCount, 0),
      },
      websites: websitesView,
      infrastructure: {
        nodes: nodesView,
      },
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
    isUp,
  }: {
    activeVisitors: number;
    alerts: Array<{ severity: string }>;
    sslIsValid: boolean | null;
    isUp: boolean | null;
  }) {
    if (
      alerts.some((alert) => alert.severity === 'CRITICAL') ||
      sslIsValid === false ||
      isUp === false
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
    nodes: Array<{ status: string }>,
  ) {
    if (
      websites.some((website) => website.status === 'critical') ||
      nodes.some((node) => node.status === 'OFFLINE')
    ) {
      return 'critical';
    }

    if (
      websites.some((website) => website.status === 'warning') ||
      nodes.some((node) => node.status === 'DEGRADED')
    ) {
      return 'warning';
    }

    if (
      websites.some((website) => website.status === 'monitoring') ||
      nodes.some((node) => node.status === 'UNKNOWN')
    ) {
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

  private toNumber(value: bigint | number | null) {
    return value === null ? null : Number(value);
  }

  private groupBy<T>(items: T[], getKey: (item: T) => string) {
    return Array.from(
      items
        .reduce((groups, item) => {
          const key = getKey(item);
          const group = groups.get(key) ?? [];
          group.push(item);
          groups.set(key, group);
          return groups;
        }, new Map<string, T[]>())
        .entries(),
    );
  }

  private mapVpsMetric(metric: {
    recordedAt: Date;
    cpuUsagePercent: number;
    cpuCoreCount: number | null;
    load1: number | null;
    load5: number | null;
    load15: number | null;
    memoryTotalMB: number;
    memoryUsedMB: number;
    memoryAvailableMB: number | null;
    swapTotalMB: number | null;
    swapUsedMB: number | null;
    processCount: number | null;
    uptimeSeconds: bigint | null;
    liteSpeedConnections: number;
    diskReadBytesPerSecond: bigint;
    diskWriteBytesPerSecond: bigint;
    diskIops: number;
    storageTotalMB: number;
    storageAvailableMB: number;
    networkRxBytesPerSecond: bigint;
    networkTxBytesPerSecond: bigint;
  }) {
    return {
      recordedAt: metric.recordedAt,
      cpu: {
        usagePercent: metric.cpuUsagePercent,
        coreCount: metric.cpuCoreCount,
        load1: metric.load1,
        load5: metric.load5,
        load15: metric.load15,
      },
      memory: {
        totalMB: metric.memoryTotalMB,
        usedMB: metric.memoryUsedMB,
        availableMB: metric.memoryAvailableMB,
        usagePercent: this.calculatePercent(
          metric.memoryUsedMB,
          metric.memoryTotalMB,
        ),
      },
      swap: {
        totalMB: metric.swapTotalMB,
        usedMB: metric.swapUsedMB,
        usagePercent: this.calculatePercent(
          metric.swapUsedMB ?? 0,
          metric.swapTotalMB ?? 0,
        ),
      },
      processCount: metric.processCount,
      uptimeSeconds: this.toNumber(metric.uptimeSeconds),
      liteSpeedConnections: metric.liteSpeedConnections,
      disk: {
        readBytesPerSecond: this.toNumber(metric.diskReadBytesPerSecond),
        writeBytesPerSecond: this.toNumber(metric.diskWriteBytesPerSecond),
        iops: metric.diskIops,
      },
      storage: {
        totalMB: metric.storageTotalMB,
        availableMB: metric.storageAvailableMB,
        usedPercent: this.calculatePercent(
          metric.storageTotalMB - metric.storageAvailableMB,
          metric.storageTotalMB,
        ),
      },
      network: {
        rxBytesPerSecond: this.toNumber(metric.networkRxBytesPerSecond),
        txBytesPerSecond: this.toNumber(metric.networkTxBytesPerSecond),
      },
    };
  }
}
