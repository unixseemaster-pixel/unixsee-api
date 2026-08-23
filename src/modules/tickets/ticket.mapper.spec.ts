import { describe, expect, it } from 'vitest';

import {
  Role,
  TicketPriority,
  TicketServiceCategory,
  TicketStatus,
} from '#/generated/prisma/enums.js';

import { mapTicketDetail, mapTicketListItem } from './ticket.mapper.js';

const baseTicket = {
  id: 'ticket-1',
  tenantId: 'tenant-1',
  websiteId: 'website-1',
  createdById: 'user-1',
  assigneeId: null,
  number: 'TCK-1000',
  subject: 'Payment broken',
  service: TicketServiceCategory.WOOCOMMERCE_SUPPORT,
  status: TicketStatus.IN_PROGRESS,
  priority: TicketPriority.NORMAL,
  resolvedAt: null,
  autoCloseAt: null,
  createdAt: new Date('2026-07-18T08:14:00.000Z'),
  updatedAt: new Date('2026-07-19T15:20:00.000Z'),
};

describe('mapTicketListItem / mapTicketDetail', () => {
  it('uses trimmed displayName for website name, else domain', () => {
    const withDisplayName = mapTicketListItem({
      ...baseTicket,
      website: {
        id: 'website-1',
        domain: 'greenario.com',
        displayName: '  Greenario Store  ',
      },
      messages: [],
    });
    expect(withDisplayName.website).toEqual({
      id: 'website-1',
      name: 'Greenario Store',
      domain: 'greenario.com',
    });

    const withoutDisplayName = mapTicketListItem({
      ...baseTicket,
      website: {
        id: 'website-1',
        domain: 'greenario.com',
        displayName: null,
      },
      messages: [],
    });
    expect(withoutDisplayName.website?.name).toBe('greenario.com');
  });

  it('maps ADMIN/OPERATOR authors to sender SUPPORT and customers to USER', () => {
    const detail = mapTicketDetail({
      ...baseTicket,
      website: null,
      attachments: [],
      messages: [
        {
          id: 'msg-1',
          ticketId: 'ticket-1',
          authorId: 'user-1',
          body: 'Customer note',
          isInternal: false,
          createdAt: new Date('2026-07-18T09:00:00.000Z'),
          author: {
            id: 'user-1',
            fullName: 'Customer',
            role: Role.USER,
          },
        },
        {
          id: 'msg-2',
          ticketId: 'ticket-1',
          authorId: 'admin-1',
          body: 'Staff reply',
          isInternal: false,
          createdAt: new Date('2026-07-18T10:00:00.000Z'),
          author: {
            id: 'admin-1',
            fullName: 'Support',
            role: Role.ADMIN,
          },
        },
        {
          id: 'msg-3',
          ticketId: 'ticket-1',
          authorId: 'op-1',
          body: 'Operator reply',
          isInternal: false,
          createdAt: new Date('2026-07-18T11:00:00.000Z'),
          author: {
            id: 'op-1',
            fullName: 'Operator',
            role: Role.OPERATOR,
          },
        },
      ],
    });

    expect(detail.messages.map((message) => message.sender)).toEqual([
      'USER',
      'SUPPORT',
      'SUPPORT',
    ]);
  });

  it('sets unread true when lastActor is SUPPORT', () => {
    const item = mapTicketListItem({
      ...baseTicket,
      website: null,
      messages: [
        {
          id: 'msg-1',
          ticketId: 'ticket-1',
          authorId: 'admin-1',
          body: 'Need logs',
          isInternal: false,
          createdAt: new Date('2026-07-19T15:20:00.000Z'),
          author: {
            id: 'admin-1',
            fullName: 'Support',
            role: Role.ADMIN,
          },
        },
      ],
    });

    expect(item.lastActor).toBe('SUPPORT');
    expect(item.unread).toBe(true);
    expect(item.lastActivityAt).toBe('2026-07-19T15:20:00.000Z');
  });

  it('exposes resolvedAt and autoCloseAt on detail', () => {
    const resolvedAt = new Date('2026-07-17T10:28:00.000Z');
    const autoCloseAt = new Date('2026-07-24T10:28:00.000Z');
    const detail = mapTicketDetail({
      ...baseTicket,
      status: TicketStatus.RESOLVED,
      resolvedAt,
      autoCloseAt,
      website: null,
      messages: [],
      attachments: [],
    });

    expect(detail.resolvedAt).toBe(resolvedAt.toISOString());
    expect(detail.autoCloseAt).toBe(autoCloseAt.toISOString());
  });
});
