import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import {
  ContactMessageStatus,
  ContactMessageSubject,
} from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { StorageService } from '#/modules/storage/storage.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

import { CONTACT_MESSAGE_ATTACHMENT_SIGNED_URL_TTL_SECONDS } from '../contact-message-attachments.js';
import type { CreatePublicContactMessageDto } from '../dto/create-public-contact-message.dto.js';

type ContactMessageRow = {
  id: string;
  subject: ContactMessageSubject;
  fullName: string;
  email: string;
  phone: string;
  website: string | null;
  activityBasin: string | null;
  message: string;
  attachmentKeys: unknown;
  locale: string | null;
  source: string | null;
  status: ContactMessageStatus;
  createdAt: Date;
  updatedAt: Date;
};

type ContactMessageClient = {
  contactMessage: {
    create: (args: {
      data: {
        subject: ContactMessageSubject;
        fullName: string;
        email: string;
        phone: string;
        website?: string;
        activityBasin?: string;
        message: string;
        attachmentKeys: string[];
        locale?: string;
        source?: string;
      };
    }) => Promise<ContactMessageRow>;
    findMany: (args: {
      where?: { status?: ContactMessageStatus };
      orderBy: { createdAt: 'desc' };
      skip: number;
      take: number;
    }) => Promise<ContactMessageRow[]>;
    count: (args: {
      where?: { status?: ContactMessageStatus };
    }) => Promise<number>;
    findUnique: (args: {
      where: { id: string };
    }) => Promise<ContactMessageRow | null>;
    update: (args: {
      where: { id: string };
      data: { status: ContactMessageStatus };
    }) => Promise<ContactMessageRow>;
  };
};

const ALLOWED_STATUS_TRANSITIONS: Record<
  ContactMessageStatus,
  ReadonlySet<ContactMessageStatus>
> = {
  [ContactMessageStatus.NEW]: new Set([
    ContactMessageStatus.READ,
    ContactMessageStatus.ARCHIVED,
  ]),
  [ContactMessageStatus.READ]: new Set([ContactMessageStatus.ARCHIVED]),
  [ContactMessageStatus.ARCHIVED]: new Set([ContactMessageStatus.READ]),
};

function parseAttachmentKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === 'string' && item.trim().length > 0,
  );
}

@Injectable()
export class ContactMessagesService {
  private readonly logger = createAppLogger(ContactMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private get db(): ContactMessageClient {
    // Nest --watch can keep a stale PrismaClient type after `prisma generate`.
    return this.prisma as unknown as ContactMessageClient;
  }

  async createPublic(input: CreatePublicContactMessageDto) {
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim().replace(/[\s()-]/g, '');
    const attachmentKeys = (input.attachmentKeys ?? []).filter(
      (key) => typeof key === 'string' && key.trim().length > 0,
    );

    const created = await this.db.contactMessage.create({
      data: {
        subject: input.subject as ContactMessageSubject,
        fullName: input.fullName.trim(),
        email,
        phone,
        website: input.website,
        activityBasin: input.activityBasin,
        message: input.message.trim(),
        attachmentKeys,
        locale: input.locale,
        source: input.source ?? 'contact-us',
      },
    });

    this.logger.log('contact_message.created', {
      contactMessageId: created.id,
      subject: created.subject,
      email,
      attachmentCount: attachmentKeys.length,
      source: created.source,
    });

    return {
      id: created.id,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listAdmin(params?: {
    status?: ContactMessageStatus;
    skip?: number;
    take?: number;
  }) {
    const skip = Math.max(0, params?.skip ?? 0);
    const take = Math.min(100, Math.max(1, params?.take ?? 50));
    const where = params?.status ? { status: params.status } : undefined;

    const [items, total] = await Promise.all([
      this.db.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.db.contactMessage.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toAdminListItem(item)),
      total,
    };
  }

  async getAdmin(id: string) {
    const message = await this.requireMessage(id);
    const attachmentKeys = parseAttachmentKeys(message.attachmentKeys);
    const attachments = await this.buildAttachments(attachmentKeys);
    return this.toAdminDetail(message, attachments);
  }

  async updateStatus(id: string, nextStatus: ContactMessageStatus) {
    const message = await this.requireMessage(id);

    if (message.status === nextStatus) {
      return this.toAdminDetail(
        message,
        await this.buildAttachments(
          parseAttachmentKeys(message.attachmentKeys),
        ),
      );
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[message.status];
    if (!allowed.has(nextStatus)) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    const updated = await this.db.contactMessage.update({
      where: { id },
      data: { status: nextStatus },
    });

    this.logger.log('contact_message.status_updated', {
      contactMessageId: id,
      from: message.status,
      to: nextStatus,
    });

    return this.toAdminDetail(
      updated,
      await this.buildAttachments(parseAttachmentKeys(updated.attachmentKeys)),
    );
  }

  private async requireMessage(id: string): Promise<ContactMessageRow> {
    const message = await this.db.contactMessage.findUnique({ where: { id } });
    if (!message) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return message;
  }

  private toAdminListItem(message: ContactMessageRow) {
    const attachmentKeys = parseAttachmentKeys(message.attachmentKeys);
    return {
      id: message.id,
      subject: message.subject,
      fullName: message.fullName,
      email: message.email,
      phone: message.phone,
      website: message.website,
      activityBasin: message.activityBasin,
      locale: message.locale,
      source: message.source,
      status: message.status,
      attachmentCount: attachmentKeys.length,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };
  }

  private toAdminDetail(
    message: ContactMessageRow,
    attachments: Array<{
      storageKey: string;
      downloadUrl: string | null;
    }>,
  ) {
    return {
      ...this.toAdminListItem(message),
      message: message.message,
      attachments,
    };
  }

  private async buildAttachments(storageKeys: string[]) {
    return Promise.all(
      storageKeys.map(async (storageKey) => ({
        storageKey,
        downloadUrl: await this.signAttachmentDownload(storageKey),
      })),
    );
  }

  private async signAttachmentDownload(
    storageKey: string,
  ): Promise<string | null> {
    try {
      const { signedUrl } = await this.storage.createSignedUrl(
        storageKey,
        CONTACT_MESSAGE_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
      );
      return signedUrl;
    } catch (error) {
      this.logger.warn('contact_message.attachment.signed_url_failed', {
        storageKey,
        message: error instanceof Error ? error.message : 'unknown',
      });
      return null;
    }
  }
}
