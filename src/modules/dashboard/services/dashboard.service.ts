import { Injectable } from '@nestjs/common';

import { WebsiteProbeSource } from '#/generated/prisma/enums.js';
import { TrafficLoadService } from '#/modules/metrics/services/traffic-load.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { DashboardOverviewSnapshotService } from './dashboard-overview-snapshot.service.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardOverviewSnapshotService: DashboardOverviewSnapshotService,
    private readonly trafficLoadService: TrafficLoadService,
    private readonly prisma: PrismaService,
  ) {}

  async getOverview(userId: string) {
    return this.dashboardOverviewSnapshotService.getOverviewSnapshot(userId);
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
            where: {
              probeSource: WebsiteProbeSource.BACKEND,
              recordedAt: { gte: monitoringSince },
            },
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
      const concurrentRequests = latestWebMetric?.concurrentRequests ?? 0;
      const requestRate = latestWebMetric?.requestRate ?? 0;
      const traffic = this.trafficLoadService.resolve(
        latestWebMetric
          ? {
              concurrentRequests,
              requestRate,
            }
          : null,
      );
      const status = this.resolveMonitoringStatus({
        concurrentRequests,
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
        lastCheckedAt:
          website.lastProbeAt ?? latestWebMetric?.recordedAt ?? null,
        createdAt: website.createdAt,
        updatedAt: website.updatedAt,

        availability: {
          probeSource: WebsiteProbeSource.BACKEND,
          isUp: website.lastIsUp,
          statusCode: website.lastStatusCode,
          responseTimeMs: website.lastResponseTimeMs,
          ttfbMs: website.probeMetrics.at(-1)?.ttfbMs ?? null,
          errorMessage: website.probeMetrics.at(-1)?.errorMessage ?? null,
          lastProbeAt: website.lastProbeAt,
          samples: website.probeMetrics,
        },

        traffic: {
          load: traffic.load,
          activity: traffic.activity,
          activeRequests: concurrentRequests,
          requestRate,
          samples: website.metrics.map((metric) => ({
            recordedAt: metric.recordedAt,
            activeRequests: metric.concurrentRequests,
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

  private resolveMonitoringStatus({
    concurrentRequests,
    alerts,
    sslIsValid,
    isUp,
  }: {
    concurrentRequests: number;
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
      concurrentRequests > 500
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
