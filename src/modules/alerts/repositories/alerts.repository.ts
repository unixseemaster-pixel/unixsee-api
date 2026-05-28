import { Injectable } from '@nestjs/common';

import { Prisma } from '#/generated/prisma/client.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class AlertsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AlertUncheckedCreateInput) {
    return this.prisma.alert.create({
      data,
    });
  }

  findActiveByWebsiteId(websiteId: string) {
    return this.prisma.alert.findFirst({
      where: {
        websiteId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  resolveAlert(id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }

  findRecentByUserId(userId: string) {
    return this.prisma.alert.findMany({
      where: {
        website: {
          userId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  }
}
