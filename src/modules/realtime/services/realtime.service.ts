import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { Role } from '#/generated/prisma/enums.js';

export interface AuthenticatedUserSocketPayload {
  id: string;
  email: string;
  username: string;
  role: Role;
}

@Injectable()
export class RealtimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // =========================
  // AUTH
  // =========================
  async verifySocketToken(
    token: string,
  ): Promise<AuthenticatedUserSocketPayload | null> {
    try {
      return await this.jwtService.verifyAsync<AuthenticatedUserSocketPayload>(
        token,
      );
    } catch {
      return null;
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
