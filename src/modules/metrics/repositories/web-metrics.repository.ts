import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { WebsiteProbeSource } from '#/generated/prisma/enums.js';

@Injectable()
export class WebMetricsRepository {
  constructor(private prisma: PrismaService) {}

  async findLatestByUserId(userId: string) {
    const websites = await this.prisma.website.findMany({
      where: {
        userId,
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
        metrics: {
          orderBy: {
            recordedAt: 'desc',
          },
          take: 1,
        },
        probeMetrics: {
          where: { probeSource: WebsiteProbeSource.BACKEND },
          orderBy: {
            recordedAt: 'desc',
          },
          take: 1,
          select: {
            recordedAt: true,
            isUp: true,
            statusCode: true,
            responseTimeMs: true,
            ttfbMs: true,
            errorMessage: true,
          },
        },
      },
    });

    return websites.map((website) => ({
      websiteId: website.id,
      vpsNodeId: website.vpsNodeId,
      domain: website.domain,
      displayName: website.displayName,
      isActive: website.isActive,
      lastIsUp: website.lastIsUp,
      lastStatusCode: website.lastStatusCode,
      lastResponseTimeMs: website.lastResponseTimeMs,
      lastProbeAt: website.lastProbeAt,
      latest: website.metrics[0] ?? null,
      latestProbe: website.probeMetrics[0] ?? null,
    }));
  }

  async findOverviewByWebsiteId(websiteId: string) {
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
        metrics: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        probeMetrics: {
          where: { probeSource: WebsiteProbeSource.BACKEND },
          orderBy: { recordedAt: 'desc' },
          take: 1,
          select: {
            recordedAt: true,
            isUp: true,
            statusCode: true,
            responseTimeMs: true,
            ttfbMs: true,
            errorMessage: true,
          },
        },
      },
    });

    if (!website) return null;

    return {
      websiteId: website.id,
      vpsNodeId: website.vpsNodeId,
      domain: website.domain,
      displayName: website.displayName,
      isActive: website.isActive,
      lastIsUp: website.lastIsUp,
      lastStatusCode: website.lastStatusCode,
      lastResponseTimeMs: website.lastResponseTimeMs,
      lastProbeAt: website.lastProbeAt,
      latest: website.metrics[0] ?? null,
      latestProbe: website.probeMetrics[0] ?? null,
    };
  }

  findLatestByWebsiteId(websiteId: string) {
    return this.prisma.webMetric.findFirst({
      where: {
        websiteId,
      },
      orderBy: {
        recordedAt: 'desc',
      },
    });
  }

  findRangeByWebsiteId(websiteId: string, from: Date, to: Date) {
    return this.prisma.webMetric.findMany({
      where: {
        websiteId,
        recordedAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: {
        recordedAt: 'asc',
      },
    });
  }

  findLatestByWebsiteIds(websiteIds: string[]) {
    return this.prisma.webMetric.findMany({
      where: {
        websiteId: {
          in: websiteIds,
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
    });
  }
}
