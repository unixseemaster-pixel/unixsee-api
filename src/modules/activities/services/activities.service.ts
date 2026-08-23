import { Injectable } from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import type { Prisma } from '#/generated/prisma/client.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class ActivitiesService {
  private readonly logger = createAppLogger(ActivitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async create(input: {
    tenantId: string;
    websiteId?: string;
    type: string;
    summaryFa: string;
    summaryEn: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    const activity = await this.prisma.activity.create({ data: input });
    this.logger.debug('activity.created', {
      activityId: activity.id,
      type: activity.type,
      tenantId: activity.tenantId,
    });
    return activity;
  }

  async listForUser(userId: string, params?: { skip?: number; take?: number }) {
    const tenantIds = await this.tenantAccess.getAccessibleTenantIds(userId);
    const where = { tenantId: { in: tenantIds } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.activity.count({ where }),
    ]);
    return { items, total };
  }

  async listAdmin(params?: {
    tenantId?: string;
    skip?: number;
    take?: number;
  }) {
    const where = params?.tenantId ? { tenantId: params.tenantId } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.activity.count({ where }),
    ]);
    return { items, total };
  }
}
