import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VpsMetricsRepository {
  constructor(private prisma: PrismaService) {}

  findLatestByVpsId(vpsNodeId: string) {
    return this.prisma.vpsMetric.findFirst({
      where: { vpsNodeId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  findRangeByVpsId(vpsNodeId: string, from: Date, to: Date) {
    return this.prisma.vpsMetric.findMany({
      where: {
        vpsNodeId,
        recordedAt: { gte: from, lte: to },
      },
      orderBy: { recordedAt: 'asc' },
    });
  }
}
