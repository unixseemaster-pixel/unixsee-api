import { Injectable, NotFoundException } from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import { NotificationStatus } from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Injectable()
export class NotificationsService {
  private readonly logger = createAppLogger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async listForUser(userId: string, params?: { skip?: number; take?: number }) {
    const tenantIds = await this.tenantAccess.getAccessibleTenantIds(userId);
    const where = {
      status: NotificationStatus.PUBLISHED,
      OR: [{ tenantId: null }, { tenantId: { in: tenantIds } }],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        include: {
          reads: { where: { userId }, select: { readAt: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        status: NotificationStatus.PUBLISHED,
      },
    });
    if (!notification) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (notification.tenantId) {
      await this.tenantAccess.requireMembership(userId, notification.tenantId);
    }

    const read = await this.prisma.notificationRead.upsert({
      where: {
        notificationId_userId: { notificationId, userId },
      },
      create: { notificationId, userId },
      update: { readAt: new Date() },
    });

    this.logger.log('notification.read', { notificationId, userId });
    return read;
  }

  async listAdmin(params?: { skip?: number; take?: number }) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.notification.count(),
    ]);
    return { items, total };
  }

  async create(
    authorId: string,
    input: {
      titleFa: string;
      titleEn: string;
      bodyFa: string;
      bodyEn: string;
      tenantId?: string;
      status?: NotificationStatus;
    },
  ) {
    const status = input.status ?? NotificationStatus.DRAFT;
    const notification = await this.prisma.notification.create({
      data: {
        authorId,
        titleFa: input.titleFa,
        titleEn: input.titleEn,
        bodyFa: input.bodyFa,
        bodyEn: input.bodyEn,
        tenantId: input.tenantId,
        status,
        publishedAt:
          status === NotificationStatus.PUBLISHED ? new Date() : null,
      },
    });

    this.logger.log('notification.created', {
      notificationId: notification.id,
      status: notification.status,
    });
    return notification;
  }

  async update(
    id: string,
    data: {
      titleFa?: string;
      titleEn?: string;
      bodyFa?: string;
      bodyEn?: string;
      tenantId?: string | null;
      status?: NotificationStatus;
    },
  ) {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const status = data.status ?? existing.status;
    const notification = await this.prisma.notification.update({
      where: { id },
      data: {
        ...data,
        publishedAt:
          status === NotificationStatus.PUBLISHED
            ? (existing.publishedAt ?? new Date())
            : existing.publishedAt,
      },
    });

    this.logger.log('notification.updated', { notificationId: id });
    return notification;
  }
}
