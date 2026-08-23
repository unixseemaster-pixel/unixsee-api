import { Role } from '#/generated/prisma/enums.js';
import type {
  Ticket,
  TicketAttachment,
  TicketMessage,
  Tenant,
  User,
  Website,
} from '#/generated/prisma/client.js';

type TicketWebsite = Pick<Website, 'id' | 'domain' | 'displayName'>;

type TicketMessageWithAuthor = TicketMessage & {
  author: { id: string; fullName: string | null; role?: Role };
};

type TicketListRecord = Ticket & {
  website: TicketWebsite | null;
  messages: TicketMessageWithAuthor[];
};

type TicketDetailRecord = Ticket & {
  website: TicketWebsite | null;
  messages: TicketMessageWithAuthor[];
  attachments: TicketAttachment[];
};

type AdminTicketListRecord = Ticket & {
  website: TicketWebsite | null;
  tenant: Pick<Tenant, 'id' | 'name' | 'displayName' | 'status'>;
  assignee: Pick<User, 'id' | 'fullName'> | null;
  createdBy: Pick<User, 'id' | 'fullName' | 'phoneNumber' | 'email' | 'avatarUrl'>;
};

type AdminTicketDetailRecord = AdminTicketListRecord & {
  messages: TicketMessageWithAuthor[];
  attachments: TicketAttachment[];
};

export type TicketMessageSender = 'USER' | 'SUPPORT';

function mapWebsite(website: TicketWebsite | null) {
  if (!website) return null;
  return {
    id: website.id,
    name: website.displayName?.trim() || website.domain,
    domain: website.domain,
  };
}

function mapSender(
  author: TicketMessageWithAuthor['author'],
): TicketMessageSender {
  if (author.role === Role.ADMIN || author.role === Role.OPERATOR) {
    return 'SUPPORT';
  }
  return 'USER';
}

function mapAttachment(
  attachment: TicketAttachment,
  downloadUrl?: string | null,
) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    storageKey: attachment.storageKey,
    downloadUrl: downloadUrl ?? null,
    createdAt: attachment.createdAt.toISOString(),
  };
}

function mapMessage(message: TicketMessageWithAuthor) {
  return {
    id: message.id,
    body: message.body,
    sender: mapSender(message.author),
    author: {
      id: message.author.id,
      fullName: message.author.fullName,
    },
    createdAt: message.createdAt.toISOString(),
  };
}

function mapAdminMessage(message: TicketMessageWithAuthor) {
  return {
    ...mapMessage(message),
    isInternal: message.isInternal,
    attachments: [] as ReturnType<typeof mapAttachment>[],
  };
}

function deriveListActivity(ticket: TicketListRecord) {
  const lastMessage = ticket.messages[0];
  const lastActivityAt = (
    lastMessage?.createdAt ?? ticket.updatedAt
  ).toISOString();
  const lastActor: TicketMessageSender = lastMessage
    ? mapSender(lastMessage.author)
    : 'USER';
  return {
    lastActivityAt,
    lastActor,
    unread: lastActor === 'SUPPORT',
  };
}

export function mapTicketListItem(ticket: TicketListRecord) {
  const activity = deriveListActivity(ticket);
  return {
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    service: ticket.service,
    status: ticket.status,
    website: mapWebsite(ticket.website),
    unread: activity.unread,
    lastActivityAt: activity.lastActivityAt,
    lastActor: activity.lastActor,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export function mapTicketDetail(
  ticket: TicketDetailRecord,
  downloadUrls?: Map<string, string | null>,
) {
  return {
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    service: ticket.service,
    status: ticket.status,
    website: mapWebsite(ticket.website),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    autoCloseAt: ticket.autoCloseAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: ticket.messages.map((message) => ({
      ...mapMessage(message),
      attachments: [],
    })),
    attachments: ticket.attachments.map((attachment) =>
      mapAttachment(attachment, downloadUrls?.get(attachment.id)),
    ),
  };
}

export function mapAdminTicketListItem(ticket: AdminTicketListRecord) {
  return {
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    service: ticket.service,
    status: ticket.status,
    priority: ticket.priority,
    tenant: {
      id: ticket.tenant.id,
      name: ticket.tenant.displayName?.trim() || ticket.tenant.name,
      status: ticket.tenant.status,
    },
    website: mapWebsite(ticket.website),
    assignee: ticket.assignee
      ? {
          id: ticket.assignee.id,
          fullName: ticket.assignee.fullName,
        }
      : null,
    createdBy: {
      id: ticket.createdBy.id,
      fullName: ticket.createdBy.fullName,
      phoneNumber: ticket.createdBy.phoneNumber,
      email: ticket.createdBy.email,
    },
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    autoCloseAt: ticket.autoCloseAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export function mapAdminTicketDetail(
  ticket: AdminTicketDetailRecord,
  downloadUrls?: Map<string, string | null>,
) {
  return {
    ...mapAdminTicketListItem(ticket),
    messages: ticket.messages.map(mapAdminMessage),
    attachments: ticket.attachments.map((attachment) =>
      mapAttachment(attachment, downloadUrls?.get(attachment.id)),
    ),
  };
}

export function mapTicketAttachment(
  attachment: TicketAttachment,
  downloadUrl?: string | null,
) {
  return mapAttachment(attachment, downloadUrl);
}
