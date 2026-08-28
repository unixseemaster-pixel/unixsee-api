import { Injectable, NotFoundException } from '@nestjs/common';

import { AlertStatus, WebsiteProbeSource } from '#/generated/prisma/enums.js';
import { TrafficLoadService } from '#/modules/metrics/services/traffic-load.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import { DashboardOverviewSnapshotService } from './dashboard-overview-snapshot.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class DashboardService {
  private readonly logger = createAppLogger(DashboardService.name);

  constructor(
    private readonly dashboardOverviewSnapshotService: DashboardOverviewSnapshotService,
    private readonly trafficLoadService: TrafficLoadService,
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async getOverview(userId: string) {
    const overview =
      await this.dashboardOverviewSnapshotService.getOverviewSnapshot(userId);

    this.logger.debug('dashboard.overview.loaded', {
      userId,
      websiteCount: overview.websites.length,
      vpsNodeCount: overview.vpsNodes.length,
      status: overview.status,
    });

    return overview;
  }

  async getWebsiteDetails(userId: string, websiteId: string) {
    await this.tenantAccess.assertWebsiteAccess(userId, websiteId);
    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,
      },
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
        sslMetrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
          select: {
            recordedAt: true,
            isValid: true,
            validFrom: true,
            validTo: true,
            daysRemaining: true,
            issuer: true,
            subject: true,
            statusMessage: true,
          },
        },
        ssl: {
          select: {
            issuer: true,
            subject: true,
            validFrom: true,
            validTo: true,
            isValid: true,
            isAutoRenewable: true,
            statusMessage: true,
          },
        },
        vpsNode: {
          select: {
            id: true,
            name: true,
            status: true,
            hostname: true,
            publicIp: true,
            osName: true,
            osVersion: true,
            kernelVersion: true,
            agentVersion: true,
            lastSeenAt: true,
            vpsMetrics: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: {
                recordedAt: true,
                cpuUsagePercent: true,
                memoryUsedMB: true,
                memoryTotalMB: true,
                storageTotalMB: true,
                storageAvailableMB: true,
                liteSpeedConnections: true,
                networkRxBytesPerSecond: true,
                networkTxBytesPerSecond: true,
              },
            },
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
            createdAt: true,
            updatedAt: true,
            metadata: true,
          },
        },
      },
    });

    if (!website) {
      this.logger.warn('dashboard.website_details.not_found', {
        userId,
        websiteId,
      });
      throw new NotFoundException('Website not found');
    }

    const latestWebMetric = website.metrics[0] ?? null;
    const latestProbeMetric = website.probeMetrics[0] ?? null;
    const latestSslMetric = website.sslMetrics[0] ?? null;
    const latestVpsMetric = website.vpsNode?.vpsMetrics[0] ?? null;
    const activeAlerts = website.alerts.filter(
      (alert) => alert.status === AlertStatus.ACTIVE,
    );
    const traffic = this.trafficLoadService.resolve(
      latestWebMetric
        ? {
            concurrentRequests: latestWebMetric.concurrentRequests,
            requestRate: latestWebMetric.requestRate,
          }
        : null,
    );
    const status = this.resolveMonitoringStatus({
      concurrentRequests: latestWebMetric?.concurrentRequests ?? 0,
      alerts: activeAlerts,
      sslIsValid: latestSslMetric?.isValid ?? website.ssl?.isValid ?? null,
      isUp: latestProbeMetric?.isUp ?? null,
    });
    const lastCheckedAt = this.getLatestDate([
      latestProbeMetric?.recordedAt,
      website.lastProbeAt,
      latestWebMetric?.recordedAt,
      latestSslMetric?.recordedAt,
      latestVpsMetric?.recordedAt,
    ]);
    const checkout = this.buildCheckoutSnapshot(activeAlerts);
    const backups = this.buildBackupSnapshot();
    const activity = this.buildWebsiteActivity({
      domain: website.domain,
      latestProbeAt: latestProbeMetric?.recordedAt ?? website.lastProbeAt,
      latestMetricAt: latestWebMetric?.recordedAt ?? null,
      latestSslMetricAt: latestSslMetric?.recordedAt ?? null,
      alerts: website.alerts,
      isUp: latestProbeMetric?.isUp ?? null,
      trafficLoad: traffic.load,
    });

    this.logger.debug('dashboard.website_details.loaded', {
      userId,
      websiteId,
      domain: website.domain,
      status,
      activeAlertCount: activeAlerts.length,
    });

    return {
      generatedAt: new Date(),
      lastCheckedAt,
      website: {
        websiteId: website.id,
        vpsNodeId: website.vpsNodeId,
        domain: website.domain,
        displayName: website.displayName,
        isActive: website.isActive,
        status,
        lastCheckedAt,
        createdAt: website.createdAt,
        updatedAt: website.updatedAt,
      },
      availability: {
        probeSource: WebsiteProbeSource.BACKEND,
        isUp: latestProbeMetric?.isUp ?? null,
        statusCode: latestProbeMetric?.statusCode ?? null,
        responseTimeMs: latestProbeMetric?.responseTimeMs ?? null,
        ttfbMs: latestProbeMetric?.ttfbMs ?? null,
        errorMessage: latestProbeMetric?.errorMessage ?? null,
        lastProbeAt:
          latestProbeMetric?.recordedAt ?? website.lastProbeAt ?? null,
      },
      traffic: {
        load: traffic.load,
        activity: traffic.activity,
        concurrentRequests: latestWebMetric?.concurrentRequests ?? null,
        requestRate: latestWebMetric?.requestRate ?? null,
        activeConnections: latestWebMetric?.activeConnections ?? null,
        processingRequests: latestWebMetric?.processingRequests ?? null,
        bytesInPerSecond: this.serializeBigInt(
          latestWebMetric?.bytesInPerSecond,
        ),
        bytesOutPerSecond: this.serializeBigInt(
          latestWebMetric?.bytesOutPerSecond,
        ),
        lastMetricAt: latestWebMetric?.recordedAt ?? null,
      },
      ssl: {
        isValid: latestSslMetric?.isValid ?? website.ssl?.isValid ?? null,
        validFrom: latestSslMetric?.validFrom ?? website.ssl?.validFrom ?? null,
        validTo: latestSslMetric?.validTo ?? website.ssl?.validTo ?? null,
        daysRemaining:
          latestSslMetric?.daysRemaining ??
          this.calculateDaysRemaining(website.ssl?.validTo ?? null),
        issuer: latestSslMetric?.issuer ?? website.ssl?.issuer ?? null,
        subject: latestSslMetric?.subject ?? website.ssl?.subject ?? null,
        isAutoRenewable: website.ssl?.isAutoRenewable ?? null,
        statusMessage:
          latestSslMetric?.statusMessage ?? website.ssl?.statusMessage ?? null,
        status: this.resolveSslStatus({
          isValid: latestSslMetric?.isValid ?? website.ssl?.isValid ?? null,
          daysRemaining:
            latestSslMetric?.daysRemaining ??
            this.calculateDaysRemaining(website.ssl?.validTo ?? null),
        }),
        lastCheckedAt: latestSslMetric?.recordedAt ?? null,
      },
      vpsNode: website.vpsNode
        ? {
            vpsNodeId: website.vpsNode.id,
            name: website.vpsNode.name,
            status: website.vpsNode.status,
            hostname: website.vpsNode.hostname,
            publicIp: website.vpsNode.publicIp,
            osName: website.vpsNode.osName,
            osVersion: website.vpsNode.osVersion,
            kernelVersion: website.vpsNode.kernelVersion,
            agentVersion: website.vpsNode.agentVersion,
            lastSeenAt: website.vpsNode.lastSeenAt,
            latestMetricAt: latestVpsMetric?.recordedAt ?? null,
            cpuUsagePercent: latestVpsMetric?.cpuUsagePercent ?? null,
            memoryUsagePercent: latestVpsMetric
              ? this.calculateNullablePercent(
                  latestVpsMetric.memoryUsedMB,
                  latestVpsMetric.memoryTotalMB,
                )
              : null,
            memoryUsedMB: latestVpsMetric?.memoryUsedMB ?? null,
            memoryTotalMB: latestVpsMetric?.memoryTotalMB ?? null,
            storageUsagePercent: latestVpsMetric
              ? this.calculateNullablePercent(
                  latestVpsMetric.storageTotalMB -
                    latestVpsMetric.storageAvailableMB,
                  latestVpsMetric.storageTotalMB,
                )
              : null,
            diskUsagePercent: latestVpsMetric
              ? this.calculateNullablePercent(
                  latestVpsMetric.storageTotalMB -
                    latestVpsMetric.storageAvailableMB,
                  latestVpsMetric.storageTotalMB,
                )
              : null,
            storageTotalMB: latestVpsMetric?.storageTotalMB ?? null,
            storageAvailableMB: latestVpsMetric?.storageAvailableMB ?? null,
            liteSpeedConnections: latestVpsMetric?.liteSpeedConnections ?? null,
            networkRxBytesPerSecond: this.serializeBigInt(
              latestVpsMetric?.networkRxBytesPerSecond,
            ),
            networkTxBytesPerSecond: this.serializeBigInt(
              latestVpsMetric?.networkTxBytesPerSecond,
            ),
          }
        : null,
      alerts: {
        activeCount: activeAlerts.length,
        recent: website.alerts.map((alert) => ({
          id: alert.id,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          status: alert.status,
          startedAt: alert.startedAt,
          resolvedAt: alert.resolvedAt,
          createdAt: alert.createdAt,
          updatedAt: alert.updatedAt,
          metadata: alert.metadata,
        })),
      },
      checkout,
      backups,
      activity,
    };
  }

  async getMonitoring(userId: string) {
    const monitoringSince = new Date(Date.now() - 1000 * 60 * 60 * 24);

    const [websites, vpsNodes] = await Promise.all([
      this.prisma.website.findMany({
        where: {
          tenantId: {
            in: await this.tenantAccess.getAccessibleTenantIds(userId),
          },
        },
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
          websites: {
            some: {
              tenantId: {
                in: await this.tenantAccess.getAccessibleTenantIds(userId),
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          agentInstanceId: true,
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
        agentInstanceId: node.agentInstanceId,
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

    const status = this.resolveGlobalMonitoringStatus(websitesView, nodesView);

    this.logger.debug('dashboard.monitoring.loaded', {
      userId,
      websiteCount: websitesView.length,
      nodeCount: nodesView.length,
      status,
    });

    return {
      status,
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

  private buildCheckoutSnapshot(
    activeAlerts: Array<{ title: string; message: string; severity: string }>,
  ) {
    const checkoutAlert = activeAlerts.find((alert) =>
      this.containsCheckoutKeyword(`${alert.title} ${alert.message}`),
    );

    if (checkoutAlert) {
      return {
        status:
          checkoutAlert.severity === 'CRITICAL' ? 'issue_detected' : 'degraded',
        message: checkoutAlert.message,
        lastCheckedAt: null,
      };
    }

    return {
      status: 'unknown',
      message: 'No dedicated checkout probe is configured yet.',
      lastCheckedAt: null,
    };
  }

  private buildBackupSnapshot() {
    return {
      latest: null,
      history: [],
    };
  }

  private buildWebsiteActivity({
    domain,
    latestProbeAt,
    latestMetricAt,
    latestSslMetricAt,
    alerts,
    isUp,
    trafficLoad,
  }: {
    domain: string;
    latestProbeAt: Date | null | undefined;
    latestMetricAt: Date | null | undefined;
    latestSslMetricAt: Date | null | undefined;
    alerts: Array<{
      id: string;
      title: string;
      message: string;
      severity: string;
      status: string;
      startedAt: Date;
      resolvedAt: Date | null;
      updatedAt: Date;
    }>;
    isUp: boolean | null;
    trafficLoad: string;
  }) {
    const activity: Array<{
      id: string;
      type: string;
      title: string;
      description: string | null;
      time: string | null;
      tone: string;
    }> = alerts.slice(0, 4).map((alert) => ({
      id: `alert-${alert.id}`,
      type: 'alert',
      title: alert.title,
      description: alert.message,
      time: (alert.resolvedAt ?? alert.startedAt).toISOString(),
      tone: this.mapActivityTone(alert.severity, alert.status),
    }));

    if (latestProbeAt) {
      activity.push({
        id: `probe-${domain}-${latestProbeAt.toISOString()}`,
        type: 'probe',
        title:
          isUp === false
            ? 'Availability issue detected'
            : 'Availability checked',
        description:
          isUp === false
            ? 'The latest backend public probe reported the website as down.'
            : 'The latest backend public probe completed successfully.',
        time: latestProbeAt.toISOString(),
        tone: isUp === false ? 'critical' : 'success',
      });
    }

    if (latestMetricAt) {
      activity.push({
        id: `traffic-${domain}-${latestMetricAt.toISOString()}`,
        type: 'traffic',
        title: 'Traffic metrics received',
        description: `Current traffic pressure is ${trafficLoad}.`,
        time: latestMetricAt.toISOString(),
        tone:
          trafficLoad === 'critical' || trafficLoad === 'high'
            ? 'warning'
            : 'info',
      });
    }

    if (latestSslMetricAt) {
      activity.push({
        id: `ssl-${domain}-${latestSslMetricAt.toISOString()}`,
        type: 'ssl',
        title: 'SSL state checked',
        description: 'Latest SSL certificate state was refreshed.',
        time: latestSslMetricAt.toISOString(),
        tone: 'info',
      });
    }

    return activity
      .sort((first, second) => {
        const firstTime = first.time ? new Date(first.time).getTime() : 0;
        const secondTime = second.time ? new Date(second.time).getTime() : 0;
        return secondTime - firstTime;
      })
      .slice(0, 8);
  }

  private containsCheckoutKeyword(value: string) {
    return /checkout|payment|gateway|درگاه|پرداخت|تسویه/i.test(value);
  }

  private mapActivityTone(severity: string, status: string) {
    if (status === 'RESOLVED') return 'success';
    if (severity === 'CRITICAL') return 'critical';
    if (severity === 'WARNING') return 'warning';

    return 'info';
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

  private calculateNullablePercent(
    used: number | null | undefined,
    total: number | null | undefined,
  ) {
    if (used === null || used === undefined) return null;
    if (total === null || total === undefined || total <= 0) return null;

    return this.calculatePercent(used, total);
  }

  private serializeBigInt(value: bigint | number | null | undefined) {
    if (value === null || value === undefined) return null;

    return value.toString();
  }

  private getLatestDate(dates: Array<Date | null | undefined>): Date | null {
    return dates.reduce<Date | null>((latest, date) => {
      if (!date) return latest;
      if (!latest || date.getTime() > latest.getTime()) return date;

      return latest;
    }, null);
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
