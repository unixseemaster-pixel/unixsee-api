import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { Role } from '#/generated/prisma/enums.js';
import type { AppConfigType } from '#/utils/config/app.config.js';
import { WebsiteProbeSource } from '#/generated/prisma/enums.js';
import { DashboardOverviewSnapshotService } from '#/modules/dashboard/services/dashboard-overview-snapshot.service.js';
import { DashboardService } from '#/modules/dashboard/services/dashboard.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

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
  private readonly logger = createAppLogger(RealtimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfigType, true>,
    private readonly dashboardOverviewSnapshotService: DashboardOverviewSnapshotService,
    private readonly dashboardService: DashboardService,
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
      this.logger.warn('socket.auth.rejected_access_token_invalid');
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
      this.logger.warn('socket.auth.rejected_monitoring_access_invalid', {
        userId: accessPayload.sub,
        hasUser: Boolean(user),
        hasMonitoringPayload: Boolean(monitoringPayload),
      });
      return null;
    }

    this.logger.debug('socket.auth.monitoring_authorized', {
      userId: user.id,
      expiresAt: new Date(
        Math.min(accessPayload.exp, monitoringPayload.exp) * 1000,
      ),
    });

    return {
      user,
      expiresAt: new Date(
        Math.min(accessPayload.exp, monitoringPayload.exp) * 1000,
      ),
    };
  }

  async authorizeOverviewSocket(
    token: string,
  ): Promise<AuthorizedSocketSession | null> {
    const accessPayload = await this.verifyAccessTokenPayload(token);

    if (!accessPayload) {
      this.logger.warn('socket.auth.rejected_overview_token_invalid');
      return null;
    }

    const user = await this.getAuthenticatedUser(accessPayload.sub);

    if (!user) {
      this.logger.warn('socket.auth.rejected_user_not_found', {
        userId: accessPayload.sub,
      });
      return null;
    }

    this.logger.debug('socket.auth.overview_authorized', {
      userId: user.id,
      expiresAt: new Date(accessPayload.exp * 1000),
    });

    return {
      user,
      expiresAt: new Date(accessPayload.exp * 1000),
    };
  }

  async authorizeMonitoringSocket(
    token: string,
    monitoringAccessToken: string | null,
  ): Promise<AuthorizedSocketSession | null> {
    if (!monitoringAccessToken) {
      this.logger.warn('socket.auth.rejected_monitoring_token_missing');
      return null;
    }

    return this.authorizeSocket(token, monitoringAccessToken);
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
    return this.dashboardOverviewSnapshotService.getOverviewSnapshot(userId);
  }

  async getOverviewWebsiteTick(websiteId: string) {
    return this.dashboardOverviewSnapshotService.getOverviewWebsiteTick(
      websiteId,
    );
  }

  async getOverviewVpsTick(userId: string, vpsNodeId: string) {
    return this.dashboardOverviewSnapshotService.getOverviewVpsTick(
      userId,
      vpsNodeId,
    );
  }

  async getWebsiteDetailsTick(websiteId: string) {
    const userId = await this.getUserIdByWebsiteId(websiteId);

    if (!userId) {
      return null;
    }

    return this.dashboardService.getWebsiteDetails(userId, websiteId);
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

    const safeNodes = nodes.filter(Boolean);
    const safeWebsites = websites.filter(Boolean);

    this.logger.debug('socket.monitoring_snapshot.loaded', {
      userId,
      nodeCount: safeNodes.length,
      websiteCount: safeWebsites.length,
    });

    return {
      generatedAt: new Date(),
      nodes: safeNodes,
      websites: safeWebsites,
    };
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
          where: { probeSource: WebsiteProbeSource.BACKEND },
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

    if (!user) {
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
