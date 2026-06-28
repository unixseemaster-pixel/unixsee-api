import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { Role } from '#/generated/prisma/enums.js';
import type { AppConfigType } from '#/utils/config/app.config.js';
import { SystemHealthService } from '#/modules/health/services/system-health.service.js';

export interface AuthenticatedUserSocketPayload {
  id: string;
  email: string | null;
  username: string | null;
  role: Role;
}

type SocketAccessTokenPayload = {
  sub: string;
  iat: number;
  exp: number;
};

type SocketMonitoringAccessTokenPayload = SocketAccessTokenPayload & {
  purpose: 'MONITORING_ACCESS';
};

export interface AuthorizedSocketSession {
  user: AuthenticatedUserSocketPayload;
  expiresAt: Date;
}

@Injectable()
export class RealtimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfigType, true>,
    private readonly systemHealthService: SystemHealthService,
  ) {}

  // =========================
  // AUTH
  // =========================
  async authorizeSocket(
    token: string,
    monitoringAccessToken: string,
  ): Promise<AuthorizedSocketSession | null> {
    const accessPayload = await this.verifyAccessTokenPayload(token);

    if (!accessPayload) {
      return null;
    }

    const [user, monitoringPayload] = await Promise.all([
      this.getAuthenticatedUser(accessPayload.sub),
      this.verifyMonitoringAccessTokenPayload(monitoringAccessToken),
    ]);

    if (
      !user ||
      !monitoringPayload ||
      monitoringPayload.sub !== user.id ||
      monitoringPayload.purpose !== 'MONITORING_ACCESS'
    ) {
      return null;
    }

    return {
      user,
      expiresAt: new Date(
        Math.min(accessPayload.exp, monitoringPayload.exp) * 1000,
      ),
    };
  }

  async verifySocketToken(
    token: string,
  ): Promise<AuthenticatedUserSocketPayload | null> {
    const payload = await this.verifyAccessTokenPayload(token);
    return payload ? this.getAuthenticatedUser(payload.sub) : null;
  }

  async verifyMonitoringAccessToken(
    token: string,
    userId: string,
  ): Promise<boolean> {
    const payload = await this.verifyMonitoringAccessTokenPayload(token);
    return payload?.sub === userId && payload.purpose === 'MONITORING_ACCESS';
  }

  // =========================
  // TENANT SCOPE (WEBSITE-CENTRIC)
  // =========================

  async getAllowedWebsiteIdsForUser(userId: string): Promise<string[]> {
    const websites = await this.prisma.website.findMany({
      where: { userId },
      select: { id: true },
    });

    return websites.map((w) => w.id);
  }

  async getAllowedVpsNodeIdsForUser(userId: string): Promise<string[]> {
    const vpsNodes = await this.prisma.vpsNode.findMany({
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
      select: { id: true },
      distinct: ['id'],
    });

    return vpsNodes.map((v) => v.id);
  }

  // =========================
  // DASHBOARD SNAPSHOTS (WEBSITE-FIRST)
  // =========================

  async getWebsiteSnapshot(websiteId: string) {
    return this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        domain: true,
        isActive: true,

        ssl: {
          select: {
            isValid: true,
            validTo: true,
            issuer: true,
          },
        },

        metrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
          select: {
            recordedAt: true,
            concurrentRequests: true,
          },
        },
      },
    });
  }

  async getWebsiteLatestMetric(websiteId: string) {
    return this.prisma.webMetric.findFirst({
      where: { websiteId },
      orderBy: { recordedAt: 'desc' },
      select: {
        recordedAt: true,
        concurrentRequests: true,
        requestRate: true,
      },
    });
  }

  async getOverviewSnapshot(userId: string) {
    const [websites, vpsNodes, recentAlerts, expiringCertificates] =
      await Promise.all([
        this.prisma.website.findMany({
          where: { userId },
          select: {
            id: true,
            metrics: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
              select: {
                recordedAt: true,
                concurrentRequests: true,
                requestRate: true,
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
      const activeVisitors = latestMetric?.concurrentRequests ?? 0;
      const websiteAlerts = recentAlerts.filter(
        (alert) => alert.websiteId === website.id,
      );

      return {
        websiteId: website.id,
        activeVisitors,
        requestRate: latestMetric?.requestRate ?? 0,
        lastCheckedAt: latestMetric?.recordedAt ?? null,
        status: this.systemHealthService.calculate({
          activeVisitors,
          alerts: websiteAlerts.map((alert) => ({
            status: alert.severity.toLowerCase(),
          })),
        }),
        trafficStatus: this.resolveTrafficLabel(activeVisitors),
      };
    });

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
        lastCheckedAt: latestMetric?.recordedAt ?? node.lastSeenAt,
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

    const overview = {
      generatedAt: new Date(),
      status,
      message: this.resolveOverviewStatusMessage(status),
      lastCheckedAt: this.getLatestTimestamp(
        [...websiteCards, ...vpsCards]
          .filter((item) => Boolean(item.lastCheckedAt))
          .map((item) => ({ lastCheckedAt: item.lastCheckedAt as Date })),
      ),
      websites: websiteCards,
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

    return this.toJsonSafe(overview);
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

  async getUserIdByWebsiteId(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        userId: true,
      },
    });

    return website?.userId ?? null;
  }

  async getUserIdsByVpsNodeId(vpsNodeId: string) {
    const node = await this.prisma.vpsNode.findUnique({
      where: { id: vpsNodeId },
      select: {
        userId: true,
        websites: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!node) {
      return [];
    }

    return Array.from(
      new Set(
        [node.userId, ...node.websites.map((website) => website.userId)].filter(
          (userId): userId is string => Boolean(userId),
        ),
      ),
    );
  }

  async getMonitoringSnapshot(userId: string) {
    const [vpsNodeIds, websiteIds] = await Promise.all([
      this.getAllowedVpsNodeIdsForUser(userId),
      this.getAllowedWebsiteIdsForUser(userId),
    ]);

    const [nodes, websites] = await Promise.all([
      Promise.all(vpsNodeIds.map((id) => this.getVpsMonitoringSnapshot(id))),
      Promise.all(
        websiteIds.map((id) => this.getWebsiteMonitoringSnapshot(id)),
      ),
    ]);

    return {
      generatedAt: new Date(),
      nodes: nodes.filter(Boolean),
      websites: websites.filter(Boolean),
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

  async getVpsMonitoringSnapshot(vpsNodeId: string) {
    const node = await this.prisma.vpsNode.findUnique({
      where: { id: vpsNodeId },
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
        },
        filesystemMetrics: {
          orderBy: { recordedAt: 'desc' },
          distinct: ['mountPoint'],
        },
        networkInterfaceMetrics: {
          orderBy: { recordedAt: 'desc' },
          distinct: ['interfaceName'],
        },
        serviceMetrics: {
          orderBy: { recordedAt: 'desc' },
          distinct: ['serviceName'],
        },
        alerts: {
          where: { status: 'ACTIVE' },
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!node) {
      return null;
    }

    return this.toJsonSafe({
      ...node,
      latestMetrics: node.vpsMetrics[0] ?? null,
      vpsMetrics: undefined,
    });
  }

  async getWebsiteMonitoringSnapshot(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
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
        ssl: true,
        metrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        probeMetrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        sslMetrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        alerts: {
          where: { status: 'ACTIVE' },
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!website) {
      return null;
    }

    return this.toJsonSafe({
      ...website,
      latestTraffic: website.metrics[0] ?? null,
      latestProbe: website.probeMetrics[0] ?? null,
      latestSslMetric: website.sslMetrics[0] ?? null,
      metrics: undefined,
      probeMetrics: undefined,
      sslMetrics: undefined,
    });
  }

  private async verifyAccessTokenPayload(token: string) {
    try {
      return await this.jwtService.verifyAsync<SocketAccessTokenPayload>(
        token,
        {
          secret: this.config.get('app', { infer: true }).jwt.accessSecret,
        },
      );
    } catch {
      return null;
    }
  }

  private async verifyMonitoringAccessTokenPayload(token: string) {
    try {
      return await this.jwtService.verifyAsync<SocketMonitoringAccessTokenPayload>(
        token,
        {
          secret: this.config.get('app', { infer: true }).jwt
            .monitoringAccessSecret,
        },
      );
    } catch {
      return null;
    }
  }

  private async getAuthenticatedUser(
    userId: string,
  ): Promise<AuthenticatedUserSocketPayload | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        hashedRt: true,
      },
    });

    if (!user?.hashedRt) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
  }

  private toJsonSafe<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_, item) =>
        typeof item === 'bigint' ? Number(item) : item,
      ),
    ) as T;
  }
}
