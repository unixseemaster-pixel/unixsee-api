import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { Injectable } from '@nestjs/common';

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
        metrics: {
          orderBy: {
            recordedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    return websites.map((website) => ({
      websiteId: website.id,
      latest: website.metrics[0] ?? null,
    }));
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
