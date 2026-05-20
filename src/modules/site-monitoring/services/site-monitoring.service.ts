import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class SiteMonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async verifySocketToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload; // ideally typed user payload
    } catch {
      return null;
    }
  }

  async getAllowedSiteIdsForUser(userId: string): Promise<string[]> {
    const sites = await this.prisma.website.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
      },
    });

    return sites.map((site) => site.id);
  }

  async getSiteSnapshot(siteId: string) {
    const site = await this.prisma.website.findUnique({
      where: { id: siteId },
      include: {
        metrics: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return site;
  }
}
