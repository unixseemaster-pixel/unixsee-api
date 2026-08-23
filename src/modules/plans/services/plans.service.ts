import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import type { Prisma } from '#/generated/prisma/client.js';
import { Prisma as PrismaNamespace } from '#/generated/prisma/client.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Injectable()
export class PlansService {
  private readonly logger = createAppLogger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listPublished() {
    return this.prisma.plan.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async listAdmin(params?: { skip?: number; take?: number }) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.plan.count(),
    ]);
    return { items, total };
  }

  async getAdmin(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return plan;
  }

  async create(data: {
    code: string;
    nameFa: string;
    nameEn: string;
    descriptionFa?: string;
    descriptionEn?: string;
    isPublished?: boolean;
    sortOrder?: number;
    metadata?: Prisma.InputJsonValue;
  }) {
    const plan = await this.prisma.plan.create({
      data: {
        code: data.code,
        nameFa: data.nameFa,
        nameEn: data.nameEn,
        descriptionFa: data.descriptionFa,
        descriptionEn: data.descriptionEn,
        isPublished: data.isPublished ?? false,
        sortOrder: data.sortOrder ?? 0,
        metadata: data.metadata,
      },
    });

    this.logger.log('plan.created', { planId: plan.id, code: plan.code });
    return plan;
  }

  async update(
    id: string,
    data: {
      nameFa?: string;
      nameEn?: string;
      descriptionFa?: string | null;
      descriptionEn?: string | null;
      isPublished?: boolean;
      sortOrder?: number;
      metadata?: Prisma.InputJsonValue | null;
    },
  ) {
    await this.getAdmin(id);
    const { metadata, ...rest } = data;
    const plan = await this.prisma.plan.update({
      where: { id },
      data: {
        ...rest,
        ...(metadata !== undefined
          ? {
              metadata:
                metadata === null ? PrismaNamespace.DbNull : metadata,
            }
          : {}),
      },
    });
    this.logger.log('plan.updated', { planId: plan.id });
    return plan;
  }
}
