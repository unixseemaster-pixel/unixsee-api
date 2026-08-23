import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import type { Prisma } from '#/generated/prisma/client.js';
import {
  TicketPriority,
  TicketServiceCategory,
  TicketStatus,
} from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { StorageService } from '#/modules/storage/storage.service.js';
import { TenantsService } from '#/modules/tenants/services/tenants.service.js';
import type { AppConfigType } from '#/utils/config/app.config.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import {
  buildTicketAttachmentStorageKey,
  sanitizeTicketAttachmentFileName,
  TICKET_ATTACHMENT_ALLOWED_CONTENT_TYPES,
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_ATTACHMENT_MAX_COUNT,
  TICKET_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
} from '../ticket-attachments.js';
import { isWebsiteRequiredForService, TICKET_SERVICE_CATALOG } from '../ticket-service-catalog.js';
import {
  mapTicketAttachment,
  mapTicketDetail,
  mapTicketListItem,
  mapAdminTicketDetail,
  mapAdminTicketListItem,
} from '../ticket.mapper.js';
import { TicketNumberService } from './ticket-number.service.js';

const websiteSelect = {
  id: true,
  domain: true,
  displayName: true,
} as const;

const messageAuthorSelect = {
  id: true,
  fullName: true,
  role: true,
  avatarUrl: true,
} as const;

@Injectable()
export class TicketsService {
  private readonly logger = createAppLogger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly tenantsService: TenantsService,
    private readonly ticketNumbers: TicketNumberService,
    private readonly storage: StorageService,
    private readonly config: ConfigService<AppConfigType, true>,
  ) {}

  listServices() {
    return {
      items: TICKET_SERVICE_CATALOG.map((item) => ({
        code: item.code,
        websiteRequired: item.websiteRequired,
      })),
    };
  }

  async listForUser(
    userId: string,
    params?: {
      status?: TicketStatus;
      service?: TicketServiceCategory;
      websiteId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    await this.tenantsService.ensurePersonalTenantForUser(userId);
    const tenantIds = await this.tenantAccess.getAccessibleTenantIds(userId);
    const where: Prisma.TicketWhereInput = {
      tenantId: { in: tenantIds },
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.service ? { service: params.service } : {}),
      ...(params?.websiteId ? { websiteId: params.websiteId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: {
          website: { select: websiteSelect },
          messages: {
            where: { isInternal: false },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { author: { select: messageAuthorSelect } },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: items.map((ticket) => mapTicketListItem(ticket)),
      total,
    };
  }

  async getForUser(userId: string, id: string) {
    const ticket = await this.loadCustomerTicket(id);
    await this.tenantAccess.requireMembership(userId, ticket.tenantId);
    const downloadUrls = await this.buildAttachmentDownloadUrls(
      ticket.attachments,
    );
    return mapTicketDetail(ticket, downloadUrls);
  }

  async create(
    userId: string,
    input: {
      service: TicketServiceCategory;
      subject: string;
      description: string;
      websiteId?: string;
      tenantId?: string;
      attachments?: unknown[];
    },
  ) {
    if (input.attachments?.length) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    // Heal OTP-created users that never received a personal tenant.
    await this.tenantsService.ensurePersonalTenantForUser(userId);

    const tenantId =
      input.tenantId ?? (await this.tenantAccess.resolvePrimaryTenantId(userId));
    await this.tenantAccess.requireMembership(userId, tenantId);

    if (isWebsiteRequiredForService(input.service) && !input.websiteId) {
      throw new BadRequestException(ERROR_MESSAGES.fa.ticketWebsiteRequired);
    }

    if (input.websiteId) {
      const website = await this.tenantAccess.assertWebsiteAccess(
        userId,
        input.websiteId,
      );
      if (website.tenantId !== tenantId) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }
    }

    const number = await this.ticketNumbers.allocate();

    const ticket = await this.prisma.ticket.create({
      data: {
        tenantId,
        websiteId: input.websiteId,
        createdById: userId,
        number,
        subject: input.subject.trim(),
        service: input.service,
        priority: TicketPriority.NORMAL,
        status: TicketStatus.SUBMITTED,
        messages: {
          create: {
            authorId: userId,
            body: input.description.trim(),
            isInternal: false,
          },
        },
      },
      include: {
        website: { select: websiteSelect },
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: messageAuthorSelect } },
        },
        attachments: true,
      },
    });

    this.logger.log('ticket.created', {
      ticketId: ticket.id,
      number: ticket.number,
      tenantId,
      userId,
      service: ticket.service,
    });

    return mapTicketDetail(ticket);
  }

  async addCustomerMessage(
    userId: string,
    ticketId: string,
    bodyOrInput: string | { body: string; idempotencyKey?: string },
  ) {
    const input =
      typeof bodyOrInput === 'string'
        ? { body: bodyOrInput }
        : bodyOrInput;
    const idempotencyKey = input.idempotencyKey?.trim() || undefined;

    const ticket = await this.loadCustomerTicket(ticketId);
    await this.tenantAccess.requireMembership(userId, ticket.tenantId);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new ConflictException(ERROR_MESSAGES.fa.ticketClosed);
    }

    const message = await this.prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.ticketMessage.findFirst({
          where: {
            ticketId: ticket.id,
            idempotencyKey,
          },
          include: { author: { select: messageAuthorSelect } },
        });
        if (existing) {
          return { message: existing, created: false as const };
        }
      }

      const created = await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: userId,
          body: input.body.trim(),
          isInternal: false,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
        include: { author: { select: messageAuthorSelect } },
      });

      if (ticket.status === TicketStatus.WAITING_CUSTOMER) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: TicketStatus.IN_PROGRESS },
        });
      } else {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { updatedAt: new Date() },
        });
      }

      return { message: created, created: true as const };
    });

    if (message.created) {
      this.logger.log('ticket.message.created', {
        ticketId,
        messageId: message.message.id,
        isInternal: false,
      });
    }

    return {
      id: message.message.id,
      body: message.message.body,
      sender: 'USER' as const,
      author: {
        id: message.message.author.id,
        fullName: message.message.author.fullName,
      },
      attachments: [],
      createdAt: message.message.createdAt.toISOString(),
    };
  }

  async uploadAttachmentForUser(
    userId: string,
    ticketId: string,
    file: Express.Multer.File | undefined,
  ) {
    const ticket = await this.loadCustomerTicket(ticketId);
    await this.tenantAccess.requireMembership(userId, ticket.tenantId);
    return this.uploadAttachment(ticket, file);
  }

  async uploadAttachmentForAdmin(
    ticketId: string,
    file: Express.Multer.File | undefined,
  ) {
    const ticket = await this.loadAdminTicket(ticketId);
    return this.uploadAttachment(ticket, file);
  }

  async createDownloadUrlForUser(
    userId: string,
    ticketId: string,
    attachmentId: string,
  ) {
    const ticket = await this.loadCustomerTicket(ticketId);
    await this.tenantAccess.requireMembership(userId, ticket.tenantId);
    return this.createDownloadUrl(ticketId, attachmentId);
  }

  async createDownloadUrlForAdmin(ticketId: string, attachmentId: string) {
    await this.loadAdminTicket(ticketId);
    return this.createDownloadUrl(ticketId, attachmentId);
  }

  /** @deprecated Metadata-only attach is closed; use multipart upload. */
  async addAttachment(
    _userId: string,
    _ticketId: string,
    _input: {
      fileName: string;
      contentType: string;
      sizeBytes: number;
      storageKey: string;
    },
  ): Promise<never> {
    throw new BadRequestException(ERROR_MESSAGES.fa.validation);
  }

  async closeForUser(userId: string, ticketId: string) {
    const ticket = await this.loadCustomerTicket(ticketId);
    await this.tenantAccess.requireMembership(userId, ticket.tenantId);

    if (ticket.status !== TicketStatus.RESOLVED) {
      throw new ConflictException(ERROR_MESSAGES.fa.invalidTicketTransition);
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CLOSED,
        autoCloseAt: null,
      },
      include: {
        website: { select: websiteSelect },
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: messageAuthorSelect } },
        },
        attachments: true,
      },
    });

    this.logger.log('ticket.closed', { ticketId, by: 'customer' });
    return mapTicketDetail(updated);
  }

  async reopenForUser(userId: string, ticketId: string) {
    const ticket = await this.loadCustomerTicket(ticketId);
    await this.tenantAccess.requireMembership(userId, ticket.tenantId);

    if (ticket.status !== TicketStatus.CLOSED) {
      throw new ConflictException(ERROR_MESSAGES.fa.invalidTicketTransition);
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.IN_PROGRESS,
        resolvedAt: null,
        autoCloseAt: null,
      },
      include: {
        website: { select: websiteSelect },
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: messageAuthorSelect } },
        },
        attachments: true,
      },
    });

    this.logger.log('ticket.reopened', { ticketId, by: 'customer' });
    return mapTicketDetail(updated);
  }

  async listAdmin(params?: {
    status?: TicketStatus;
    skip?: number;
    take?: number;
  }) {
    const where = params?.status ? { status: params.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: {
          tenant: true,
          website: { select: websiteSelect },
          assignee: { select: { id: true, fullName: true } },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return {
      items: items.map((ticket) => mapAdminTicketListItem(ticket)),
      total,
    };
  }

  async getAdmin(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        tenant: true,
        website: { select: websiteSelect },
        assignee: { select: { id: true, fullName: true } },
        createdBy: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
              avatarUrl: true,
            },
          },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: messageAuthorSelect } },
        },
        attachments: true,
      },
    });
    if (!ticket) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    const downloadUrls = await this.buildAttachmentDownloadUrls(
      ticket.attachments,
    );
    return mapAdminTicketDetail(ticket, downloadUrls);
  }

  async markInProgress(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (ticket.status !== TicketStatus.SUBMITTED) {
      throw new ConflictException(ERROR_MESSAGES.fa.invalidTicketTransition);
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.IN_PROGRESS },
    });

    this.logger.log('ticket.in_progress', { ticketId });
    return updated;
  }

  async assign(ticketId: string, assigneeId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
    });
    if (!assignee) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId,
        status:
          ticket.status === TicketStatus.SUBMITTED
            ? TicketStatus.IN_PROGRESS
            : ticket.status,
      },
    });

    this.logger.log('ticket.assigned', { ticketId, assigneeId });
    return updated;
  }

  async resolve(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (
      ticket.status === TicketStatus.RESOLVED ||
      ticket.status === TicketStatus.CLOSED
    ) {
      throw new ConflictException(ERROR_MESSAGES.fa.invalidTicketTransition);
    }

    const graceDays = this.config.get('app', { infer: true }).tickets
      .autoCloseGraceDays;
    const resolvedAt = new Date();
    const autoCloseAt = new Date(
      resolvedAt.getTime() + graceDays * 24 * 60 * 60 * 1000,
    );

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.RESOLVED,
        resolvedAt,
        autoCloseAt,
      },
    });

    this.logger.log('ticket.resolved', {
      ticketId,
      resolvedAt: resolvedAt.toISOString(),
      autoCloseAt: autoCloseAt.toISOString(),
      graceDays,
    });

    return updated;
  }

  async reopen(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (ticket.status !== TicketStatus.RESOLVED) {
      throw new ConflictException(ERROR_MESSAGES.fa.invalidTicketTransition);
    }

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.IN_PROGRESS,
        resolvedAt: null,
        autoCloseAt: null,
      },
    });

    this.logger.log('ticket.reopened', { ticketId, by: 'staff' });
    return updated;
  }

  async addAdminMessage(
    authorId: string,
    ticketId: string,
    input: { body: string; isInternal?: boolean },
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (
      ticket.status === TicketStatus.RESOLVED ||
      ticket.status === TicketStatus.CLOSED
    ) {
      throw new ConflictException(
        ticket.status === TicketStatus.CLOSED
          ? ERROR_MESSAGES.fa.ticketClosed
          : ERROR_MESSAGES.fa.invalidTicketTransition,
      );
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId,
        body: input.body,
        isInternal: input.isInternal ?? false,
      },
    });

    this.logger.log('ticket.message.created', {
      ticketId,
      messageId: message.id,
      isInternal: message.isInternal,
    });
    return message;
  }

  /** Defensive helper: customers must never see internal notes. */
  assertCustomerVisible(isInternal: boolean) {
    if (isInternal) {
      throw new ForbiddenException(ERROR_MESSAGES.fa.forbidden);
    }
  }

  private async uploadAttachment(
    ticket: { id: string; status: TicketStatus },
    file: Express.Multer.File | undefined,
  ) {
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ConflictException(ERROR_MESSAGES.fa.ticketClosed);
    }

    if (!file?.buffer?.length) {
      throw new BadRequestException(ERROR_MESSAGES.fa.ticketAttachmentRequired);
    }

    if (file.size > TICKET_ATTACHMENT_MAX_BYTES) {
      throw new BadRequestException(ERROR_MESSAGES.fa.ticketAttachmentTooLarge);
    }

    const contentType = (file.mimetype || '').trim().toLowerCase();
    if (
      !contentType ||
      !TICKET_ATTACHMENT_ALLOWED_CONTENT_TYPES.has(contentType)
    ) {
      throw new BadRequestException(ERROR_MESSAGES.fa.ticketAttachmentInvalid);
    }

    const existingCount = await this.prisma.ticketAttachment.count({
      where: { ticketId: ticket.id },
    });
    if (existingCount >= TICKET_ATTACHMENT_MAX_COUNT) {
      throw new BadRequestException(ERROR_MESSAGES.fa.ticketAttachmentLimit);
    }

    const originalName = sanitizeTicketAttachmentFileName(
      file.originalname || 'file',
    );
    const storageKey = buildTicketAttachmentStorageKey(
      ticket.id,
      originalName,
    );

    await this.storage.upload(storageKey, file.buffer, {
      contentType,
      upsert: false,
    });

    try {
      const attachment = await this.prisma.ticketAttachment.create({
        data: {
          ticketId: ticket.id,
          fileName: originalName.slice(0, 255),
          contentType: contentType.slice(0, 128),
          sizeBytes: file.size,
          storageKey,
        },
      });

      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { updatedAt: new Date() },
      });

      const downloadUrl = await this.signAttachmentDownload(storageKey);

      this.logger.log('ticket.attachment.uploaded', {
        ticketId: ticket.id,
        attachmentId: attachment.id,
        sizeBytes: attachment.sizeBytes,
        contentType: attachment.contentType,
      });

      return mapTicketAttachment(attachment, downloadUrl);
    } catch (error) {
      try {
        await this.storage.remove([storageKey]);
      } catch (cleanupError) {
        this.logger.error(
          'ticket.attachment.upload_cleanup_failed',
          cleanupError as Error,
          { ticketId: ticket.id, storageKey },
        );
      }
      throw error;
    }
  }

  private async createDownloadUrl(ticketId: string, attachmentId: string) {
    const attachment = await this.prisma.ticketAttachment.findFirst({
      where: { id: attachmentId, ticketId },
    });
    if (!attachment) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const downloadUrl = await this.signAttachmentDownload(
      attachment.storageKey,
    );
    if (!downloadUrl) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      sizeBytes: attachment.sizeBytes,
      storageKey: attachment.storageKey,
      downloadUrl,
      expiresInSeconds: TICKET_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
    };
  }

  private async buildAttachmentDownloadUrls(
    attachments: Array<{ id: string; storageKey: string }>,
  ): Promise<Map<string, string | null>> {
    const entries = await Promise.all(
      attachments.map(async (attachment) => {
        const downloadUrl = await this.signAttachmentDownload(
          attachment.storageKey,
        );
        return [attachment.id, downloadUrl] as const;
      }),
    );
    return new Map(entries);
  }

  private async signAttachmentDownload(
    storageKey: string,
  ): Promise<string | null> {
    try {
      const { signedUrl } = await this.storage.createSignedUrl(
        storageKey,
        TICKET_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
      );
      return signedUrl;
    } catch (error) {
      this.logger.warn('ticket.attachment.signed_url_failed', {
        storageKey,
        message: error instanceof Error ? error.message : 'unknown',
      });
      return null;
    }
  }

  private async loadCustomerTicket(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        website: { select: websiteSelect },
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: messageAuthorSelect } },
        },
        attachments: true,
      },
    });
    if (!ticket) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return ticket;
  }

  private async loadAdminTicket(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!ticket) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return ticket;
  }
}
