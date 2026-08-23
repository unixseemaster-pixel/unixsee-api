import { Injectable } from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import type { Prisma } from '#/generated/prisma/client.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class AuditService {
  private readonly logger = createAppLogger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
  }) {
    const record = await this.prisma.auditRecord.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? null,
      },
    });

    this.logger.log('audit.recorded', {
      auditId: record.id,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
    });
    return record;
  }

  async listAdmin(params?: {
    entityType?: string;
    actorId?: string;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.AuditRecordWhereInput = {
      ...(params?.entityType ? { entityType: params.entityType } : {}),
      ...(params?.actorId ? { actorId: params.actorId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditRecord.findMany({
        where,
        include: {
          actor: { select: { id: true, fullName: true, phoneNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.auditRecord.count({ where }),
    ]);

    return { items, total };
  }
}
