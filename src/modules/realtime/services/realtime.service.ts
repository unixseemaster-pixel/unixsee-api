import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { Role } from '#/generated/prisma/enums.js';
import type { AppConfigType } from '#/utils/config/app.config.js';

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

@Injectable()
export class RealtimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfigType, true>,
  ) {}

  // =========================
  // AUTH
  // =========================
  async verifySocketToken(
    token: string,
  ): Promise<AuthenticatedUserSocketPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<SocketAccessTokenPayload>(
        token,
        {
          secret: this.config.get('app', { infer: true }).jwt.accessSecret,
        },
      );

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
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
    } catch {
      return null;
    }
  }

  async verifyMonitoringAccessToken(
    token: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const payload =
        await this.jwtService.verifyAsync<SocketMonitoringAccessTokenPayload>(
          token,
          {
            secret: this.config.get('app', { infer: true }).jwt
              .monitoringAccessSecret,
          },
        );

      return payload.sub === userId && payload.purpose === 'MONITORING_ACCESS';
    } catch {
      return false;
    }
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
}
