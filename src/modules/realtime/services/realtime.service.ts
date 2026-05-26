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

  async verifySocketToken(
    token: string,
  ): Promise<AuthenticatedUserSocketPayload | null> {
    try {
      const payload =
        await this.jwtService.verifyAsync<AuthenticatedUserSocketPayload>(
          token,
        );
      return payload;
    } catch {
      return null;
    }
  }

  async getAllowedVpsNodeIdsForUser(userId: string): Promise<string[]> {
    const directlyOwnedVpsNodes = await this.prisma.vpsNode.findMany({
      where: { userId },
      select: { id: true },
    });

    const vpsNodesHousingWebsites = await this.prisma.website.findMany({
      where: { userId },
      select: { vpsNodeId: true },
    });

    const unifiedVpsNodeIds = new Set<string>([
      ...directlyOwnedVpsNodes.map((node) => node.id),
      ...vpsNodesHousingWebsites.map((site) => site.vpsNodeId),
    ]);

    return Array.from(unifiedVpsNodeIds);
  }

  async getSiteSnapshot(siteId: string) {
    return this.prisma.website.findUnique({
      where: { id: siteId },
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
}
