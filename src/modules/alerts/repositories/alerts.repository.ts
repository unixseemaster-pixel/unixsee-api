import { Injectable } from '@nestjs/common';

import { Prisma } from '#/generated/prisma/client.js';
import { AlertStatus } from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class AlertsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AlertUncheckedCreateInput) {
    return this.prisma.alert.create({
      data,
    });
  }

  findById(id: string) {
    return this.prisma.alert.findUnique({ where: { id } });
  }

  findActiveByWebsiteId(websiteId: string) {
    return this.prisma.alert.findFirst({
      where: {
        websiteId,
        status: { in: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED] },
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
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  }

  updateStatus(
    id: string,
    status: AlertStatus,
    extra?: {
      acknowledgedAt?: Date;
      suppressedAt?: Date;
    },
  ) {
    return this.prisma.alert.update({
      where: { id },
      data: {
        status,
        ...extra,
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

  findRecentByTenantIds(tenantIds: string[]) {
    if (!tenantIds.length) {
      return Promise.resolve([]);
    }

    return this.prisma.alert.findMany({
      where: {
        website: {
          tenantId: { in: tenantIds },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  }

  async findAdmin(params?: {
    status?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.AlertWhereInput = {};
    if (
      params?.status &&
      Object.values(AlertStatus).includes(params.status as AlertStatus)
    ) {
      where.status = params.status as AlertStatus;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.alert.findMany({
        where,
        include: {
          website: { select: { id: true, domain: true, tenantId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return { items, total };
  }
}
