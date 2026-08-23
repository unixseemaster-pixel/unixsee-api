import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import {
  Role,
  TicketPriority,
  TicketServiceCategory,
  TicketStatus,
} from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { StorageService } from '#/modules/storage/storage.service.js';
import { TenantsService } from '#/modules/tenants/services/tenants.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

import { TicketNumberService } from './ticket-number.service.js';
import { TicketsService } from './tickets.service.js';

const USER_ID = 'user-1';
const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';
const TICKET_ID = 'ticket-1';
const WEBSITE_A = 'website-a';
const WEBSITE_B = 'website-b';

function baseTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: TICKET_ID,
    tenantId: TENANT_A,
    websiteId: WEBSITE_A,
    createdById: USER_ID,
    assigneeId: null,
    number: 'TCK-1000',
    subject: 'Payment broken',
    service: TicketServiceCategory.WOOCOMMERCE_SUPPORT,
    status: TicketStatus.SUBMITTED,
    priority: TicketPriority.NORMAL,
    resolvedAt: null,
    autoCloseAt: null,
    createdAt: new Date('2026-07-18T08:14:00.000Z'),
    updatedAt: new Date('2026-07-19T15:20:00.000Z'),
    website: {
      id: WEBSITE_A,
      domain: 'greenario.com',
      displayName: 'Greenario',
    },
    messages: [
      {
        id: 'msg-1',
        ticketId: TICKET_ID,
        authorId: USER_ID,
        body: 'Initial description that is long enough.',
        isInternal: false,
        createdAt: new Date('2026-07-18T08:14:00.000Z'),
        author: {
          id: USER_ID,
          fullName: 'Customer',
          role: Role.USER,
        },
      },
    ],
    attachments: [],
    ...overrides,
  };
}

describe('TicketsService', () => {
  let service: TicketsService;

  const prisma = {
    ticket: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ticketMessage: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    ticketAttachment: {
      create: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    website: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const tenantAccess = {
    getAccessibleTenantIds: vi.fn(),
    requireMembership: vi.fn(),
    resolvePrimaryTenantId: vi.fn(),
    assertWebsiteAccess: vi.fn(),
  };

  const tenantsService = {
    ensurePersonalTenantForUser: vi.fn().mockResolvedValue({ id: TENANT_A }),
  };

  const ticketNumbers = {
    allocate: vi.fn(),
  };

  const storage = {
    upload: vi.fn(),
    createSignedUrl: vi.fn(),
    remove: vi.fn(),
  };

  const config = {
    get: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    config.get.mockReturnValue({
      tickets: {
        autoCloseEnabled: true,
        autoCloseGraceDays: 7,
        autoCloseCronExpression: '0 * * * *',
      },
    });

    storage.createSignedUrl.mockResolvedValue({
      signedUrl: 'https://signed.example/file',
    });

    prisma.$transaction.mockImplementation(
      async (arg: unknown) => {
        if (typeof arg === 'function') {
          return arg(prisma);
        }
        return Promise.all(arg as Promise<unknown>[]);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantAccessService, useValue: tenantAccess },
        { provide: TenantsService, useValue: tenantsService },
        { provide: TicketNumberService, useValue: ticketNumbers },
        { provide: StorageService, useValue: storage },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  describe('create', () => {
    it('creates SUBMITTED ticket with trimmed subject/description as first customer message', async () => {
      tenantAccess.resolvePrimaryTenantId.mockResolvedValue(TENANT_A);
      tenantAccess.requireMembership.mockResolvedValue({});
      tenantAccess.assertWebsiteAccess.mockResolvedValue({
        id: WEBSITE_A,
        tenantId: TENANT_A,
      });
      ticketNumbers.allocate.mockResolvedValue('TCK-1052');
      prisma.ticket.create.mockResolvedValue(
        baseTicket({
          number: 'TCK-1052',
          subject: 'Payment broken',
          messages: [
            {
              id: 'msg-1',
              ticketId: TICKET_ID,
              authorId: USER_ID,
              body: 'Initial description that is long enough.',
              isInternal: false,
              createdAt: new Date('2026-07-18T08:14:00.000Z'),
              author: {
                id: USER_ID,
                fullName: 'Customer',
                role: Role.USER,
              },
            },
          ],
        }),
      );

      const result = await service.create(USER_ID, {
        service: TicketServiceCategory.WOOCOMMERCE_SUPPORT,
        subject: '  Payment broken  ',
        description: '  Initial description that is long enough.  ',
        websiteId: WEBSITE_A,
      });

      expect(ticketNumbers.allocate).toHaveBeenCalledOnce();
      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_A,
            subject: 'Payment broken',
            status: TicketStatus.SUBMITTED,
            messages: {
              create: {
                authorId: USER_ID,
                body: 'Initial description that is long enough.',
                isInternal: false,
              },
            },
          }),
        }),
      );
      expect(result.status).toBe(TicketStatus.SUBMITTED);
      expect(result.number).toBe('TCK-1052');
    });

    it('allows create without website for services that previously required one', async () => {
      tenantAccess.resolvePrimaryTenantId.mockResolvedValue(TENANT_A);
      tenantAccess.requireMembership.mockResolvedValue({});
      ticketNumbers.allocate.mockResolvedValue('TCK-1052b');
      prisma.ticket.create.mockResolvedValue(
        baseTicket({
          number: 'TCK-1052b',
          websiteId: null,
          website: null,
          service: TicketServiceCategory.WOOCOMMERCE_SUPPORT,
        }),
      );

      await service.create(USER_ID, {
        service: TicketServiceCategory.WOOCOMMERCE_SUPPORT,
        subject: 'Payment broken',
        description: 'Initial description that is long enough.',
      });

      expect(tenantAccess.assertWebsiteAccess).not.toHaveBeenCalled();
      expect(prisma.ticket.create).toHaveBeenCalled();
    });

    it('allows create without website for GRAPHIC_DESIGN', async () => {
      tenantAccess.resolvePrimaryTenantId.mockResolvedValue(TENANT_A);
      tenantAccess.requireMembership.mockResolvedValue({});
      ticketNumbers.allocate.mockResolvedValue('TCK-1053');
      prisma.ticket.create.mockResolvedValue(
        baseTicket({
          number: 'TCK-1053',
          websiteId: null,
          website: null,
          service: TicketServiceCategory.GRAPHIC_DESIGN,
        }),
      );

      await service.create(USER_ID, {
        service: TicketServiceCategory.GRAPHIC_DESIGN,
        subject: 'Banner refresh',
        description: 'Need a new store banner for spring sale.',
      });

      expect(tenantAccess.assertWebsiteAccess).not.toHaveBeenCalled();
      expect(prisma.ticket.create).toHaveBeenCalled();
    });

    it('rejects when website.tenantId does not match resolved ticket tenantId', async () => {
      tenantAccess.requireMembership.mockResolvedValue({});
      tenantAccess.assertWebsiteAccess.mockResolvedValue({
        id: WEBSITE_B,
        tenantId: TENANT_B,
      });
      prisma.website.findUnique.mockResolvedValue({
        id: WEBSITE_B,
        tenantId: TENANT_B,
      });
      ticketNumbers.allocate.mockResolvedValue('TCK-1054');
      prisma.ticket.create.mockResolvedValue(
        baseTicket({
          tenantId: TENANT_A,
          websiteId: WEBSITE_B,
        }),
      );

      await expect(
        service.create(USER_ID, {
          service: TicketServiceCategory.WOOCOMMERCE_SUPPORT,
          subject: 'Cross tenant website',
          description: 'Initial description that is long enough.',
          tenantId: TENANT_A,
          websiteId: WEBSITE_B,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.ticket.create).not.toHaveBeenCalled();
    });

    it('requires membership on target tenant', async () => {
      tenantAccess.requireMembership.mockRejectedValue(
        new ForbiddenException(ERROR_MESSAGES.fa.forbidden),
      );

      await expect(
        service.create(USER_ID, {
          service: TicketServiceCategory.GRAPHIC_DESIGN,
          subject: 'Banner',
          description: 'Need a new store banner for spring sale.',
          tenantId: TENANT_A,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.ticket.create).not.toHaveBeenCalled();
    });

    it('allocates number via TicketNumberService before persist', async () => {
      const order: string[] = [];
      tenantAccess.resolvePrimaryTenantId.mockResolvedValue(TENANT_A);
      tenantAccess.requireMembership.mockResolvedValue({});
      ticketNumbers.allocate.mockImplementation(async () => {
        order.push('allocate');
        return 'TCK-1100';
      });
      prisma.ticket.create.mockImplementation(async () => {
        order.push('create');
        return baseTicket({ number: 'TCK-1100', websiteId: null, website: null });
      });

      await service.create(USER_ID, {
        service: TicketServiceCategory.GRAPHIC_DESIGN,
        subject: 'Banner',
        description: 'Need a new store banner for spring sale.',
      });

      expect(order).toEqual(['allocate', 'create']);
    });
  });

  describe('getForUser / listForUser', () => {
    it('returns mapped detail for member', async () => {
      prisma.ticket.findUnique.mockResolvedValue(baseTicket());
      tenantAccess.requireMembership.mockResolvedValue({});

      const detail = await service.getForUser(USER_ID, TICKET_ID);
      expect(detail.id).toBe(TICKET_ID);
      expect(detail.number).toBe('TCK-1000');
      expect(detail.messages).toHaveLength(1);
    });

    it('forbids access when user lacks tenant membership', async () => {
      prisma.ticket.findUnique.mockResolvedValue(baseTicket());
      tenantAccess.requireMembership.mockRejectedValue(
        new ForbiddenException(ERROR_MESSAGES.fa.forbidden),
      );

      await expect(
        service.getForUser(USER_ID, TICKET_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('never includes isInternal messages in customer payloads', async () => {
      prisma.ticket.findUnique.mockResolvedValue(baseTicket());
      tenantAccess.requireMembership.mockResolvedValue({});
      tenantAccess.getAccessibleTenantIds.mockResolvedValue([TENANT_A]);
      prisma.ticket.findMany.mockResolvedValue([baseTicket()]);
      prisma.ticket.count.mockResolvedValue(1);

      await service.getForUser(USER_ID, TICKET_ID);
      await service.listForUser(USER_ID);

      expect(prisma.ticket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            messages: expect.objectContaining({
              where: { isInternal: false },
            }),
          }),
        }),
      );
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            messages: expect.objectContaining({
              where: { isInternal: false },
            }),
          }),
        }),
      );
    });
  });

  describe('addCustomerMessage', () => {
    it('rejects when ticket is CLOSED', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.CLOSED }),
      );
      tenantAccess.requireMembership.mockResolvedValue({});

      await expect(
        service.addCustomerMessage(USER_ID, TICKET_ID, 'Follow up details here'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('transitions WAITING_CUSTOMER to IN_PROGRESS', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.WAITING_CUSTOMER }),
      );
      tenantAccess.requireMembership.mockResolvedValue({});
      prisma.ticketMessage.create.mockResolvedValue({
        id: 'msg-2',
        ticketId: TICKET_ID,
        authorId: USER_ID,
        body: 'Here are the logs you asked for.',
        isInternal: false,
        createdAt: new Date('2026-07-20T10:00:00.000Z'),
        author: { id: USER_ID, fullName: 'Customer', role: Role.USER },
      });
      prisma.ticket.update.mockResolvedValue({});

      await service.addCustomerMessage(USER_ID, TICKET_ID, {
        body: 'Here are the logs you asked for.',
      });

      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: TICKET_ID },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    });

    it('creates message once for first idempotencyKey', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.IN_PROGRESS }),
      );
      tenantAccess.requireMembership.mockResolvedValue({});
      prisma.ticketMessage.findFirst.mockResolvedValue(null);
      prisma.ticketMessage.create.mockResolvedValue({
        id: 'msg-new',
        ticketId: TICKET_ID,
        authorId: USER_ID,
        body: 'First attempt body for idempotency.',
        isInternal: false,
        createdAt: new Date('2026-07-20T10:00:00.000Z'),
        author: { id: USER_ID, fullName: 'Customer', role: Role.USER },
      });
      prisma.ticket.update.mockResolvedValue({});

      const result = await service.addCustomerMessage(USER_ID, TICKET_ID, {
        body: 'First attempt body for idempotency.',
        idempotencyKey: 'K1',
      });

      expect(result.id).toBe('msg-new');
      expect(prisma.ticketMessage.create).toHaveBeenCalledOnce();
      // Contract: persist idempotencyKey with the message row for retry reconciliation.
      expect(prisma.ticketMessage.create.mock.calls[0]?.[0]?.data).toEqual(
        expect.objectContaining({
          body: 'First attempt body for idempotency.',
          idempotencyKey: 'K1',
        }),
      );
    });

    it('returns existing message and skips create on duplicate idempotencyKey', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.IN_PROGRESS }),
      );
      tenantAccess.requireMembership.mockResolvedValue({});
      const existing = {
        id: 'msg-existing',
        ticketId: TICKET_ID,
        authorId: USER_ID,
        body: 'First attempt body for idempotency.',
        isInternal: false,
        createdAt: new Date('2026-07-20T10:00:00.000Z'),
        author: { id: USER_ID, fullName: 'Customer', role: Role.USER },
      };
      // First call: no prior row; second call: same key already stored.
      prisma.ticketMessage.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing);
      prisma.ticketMessage.create.mockResolvedValue(existing);
      prisma.ticket.update.mockResolvedValue({});

      const first = await service.addCustomerMessage(USER_ID, TICKET_ID, {
        body: 'First attempt body for idempotency.',
        idempotencyKey: 'K1',
      });
      const second = await service.addCustomerMessage(USER_ID, TICKET_ID, {
        body: 'First attempt body for idempotency.',
        idempotencyKey: 'K1',
      });

      expect(first.id).toBe('msg-existing');
      expect(second.id).toBe('msg-existing');
      expect(prisma.ticketMessage.create).toHaveBeenCalledTimes(1);
    });

    it('allows a second message when idempotencyKey differs', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.IN_PROGRESS }),
      );
      tenantAccess.requireMembership.mockResolvedValue({});
      prisma.ticketMessage.findFirst.mockResolvedValue(null);
      prisma.ticketMessage.create.mockResolvedValue({
        id: 'msg-other',
        ticketId: TICKET_ID,
        authorId: USER_ID,
        body: 'A different follow-up message body.',
        isInternal: false,
        createdAt: new Date('2026-07-20T11:00:00.000Z'),
        author: { id: USER_ID, fullName: 'Customer', role: Role.USER },
      });
      prisma.ticket.update.mockResolvedValue({});

      const result = await service.addCustomerMessage(USER_ID, TICKET_ID, {
        body: 'A different follow-up message body.',
        idempotencyKey: 'K2',
      });

      expect(result.id).toBe('msg-other');
      expect(prisma.ticketMessage.create).toHaveBeenCalledOnce();
    });
  });

  describe('uploadAttachmentForUser', () => {
    it('rejects when ticket is CLOSED', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.CLOSED }),
      );
      tenantAccess.requireMembership.mockResolvedValue({});

      await expect(
        service.uploadAttachmentForUser(USER_ID, TICKET_ID, {
          fieldname: 'file',
          originalname: 'log.txt',
          encoding: '7bit',
          mimetype: 'text/plain',
          size: 12,
          buffer: Buffer.from('hello world!'),
          destination: '',
          filename: '',
          path: '',
          stream: undefined as never,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('uploads to object storage and persists attachment row', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.IN_PROGRESS }),
      );
      tenantAccess.requireMembership.mockResolvedValue({});
      prisma.ticketAttachment.count = vi.fn().mockResolvedValue(0);
      storage.upload.mockResolvedValue({
        path: 'tickets/ticket-1/uuid/log.txt',
      });
      prisma.ticketAttachment.create.mockResolvedValue({
        id: 'att-1',
        ticketId: TICKET_ID,
        fileName: 'log.txt',
        contentType: 'text/plain',
        sizeBytes: 12,
        storageKey: 'tickets/ticket-1/uuid/log.txt',
        createdAt: new Date('2026-07-20T10:00:00.000Z'),
        updatedAt: new Date('2026-07-20T10:00:00.000Z'),
      });
      prisma.ticket.update.mockResolvedValue({});

      const result = await service.uploadAttachmentForUser(USER_ID, TICKET_ID, {
        fieldname: 'file',
        originalname: 'log.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 12,
        buffer: Buffer.from('hello world!'),
        destination: '',
        filename: '',
        path: '',
        stream: undefined as never,
      });

      expect(result.id).toBe('att-1');
      expect(result.downloadUrl).toBe('https://signed.example/file');
      expect(storage.upload).toHaveBeenCalledOnce();
      expect(prisma.ticketAttachment.create).toHaveBeenCalledOnce();
    });
  });

  describe('closeForUser / reopenForUser', () => {
    it('closes RESOLVED to CLOSED and clears autoCloseAt', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({
          status: TicketStatus.RESOLVED,
          resolvedAt: new Date('2026-07-17T10:28:00.000Z'),
          autoCloseAt: new Date('2026-07-24T10:28:00.000Z'),
        }),
      );
      tenantAccess.requireMembership.mockResolvedValue({});
      prisma.ticket.update.mockResolvedValue(
        baseTicket({
          status: TicketStatus.CLOSED,
          resolvedAt: new Date('2026-07-17T10:28:00.000Z'),
          autoCloseAt: null,
        }),
      );

      const result = await service.closeForUser(USER_ID, TICKET_ID);
      expect(result.status).toBe(TicketStatus.CLOSED);
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: TicketStatus.CLOSED,
            autoCloseAt: null,
          },
        }),
      );
    });

    it('reopens CLOSED to IN_PROGRESS and clears resolvedAt/autoCloseAt', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({
          status: TicketStatus.CLOSED,
          resolvedAt: new Date('2026-07-17T10:28:00.000Z'),
          autoCloseAt: null,
        }),
      );
      tenantAccess.requireMembership.mockResolvedValue({});
      prisma.ticket.update.mockResolvedValue(
        baseTicket({
          status: TicketStatus.IN_PROGRESS,
          resolvedAt: null,
          autoCloseAt: null,
        }),
      );

      const result = await service.reopenForUser(USER_ID, TICKET_ID);
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: TicketStatus.IN_PROGRESS,
            resolvedAt: null,
            autoCloseAt: null,
          },
        }),
      );
    });

    it('rejects close when status is not RESOLVED and reopen when not CLOSED', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.IN_PROGRESS }),
      );
      tenantAccess.requireMembership.mockResolvedValue({});

      await expect(
        service.closeForUser(USER_ID, TICKET_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.reopenForUser(USER_ID, TICKET_ID),
      ).rejects.toBeInstanceOf(ConflictException);

      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.RESOLVED }),
      );
      await expect(
        service.reopenForUser(USER_ID, TICKET_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('assign / resolve / addAdminMessage', () => {
    it('markInProgress moves SUBMITTED to IN_PROGRESS', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.SUBMITTED }),
      );
      prisma.ticket.update.mockResolvedValue(
        baseTicket({ status: TicketStatus.IN_PROGRESS }),
      );

      const result = await service.markInProgress(TICKET_ID);
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: TicketStatus.IN_PROGRESS },
        }),
      );
    });

    it('markInProgress rejects non-SUBMITTED tickets', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.IN_PROGRESS }),
      );

      await expect(service.markInProgress(TICKET_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('getAdmin returns ticket with internal messages', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({
          tenant: {
            id: TENANT_A,
            name: 'tenant-a',
            displayName: 'Tenant A',
            status: 'ACTIVE',
          },
          assignee: null,
          createdBy: {
            id: USER_ID,
            fullName: 'Customer',
            phoneNumber: '+989121234567',
            email: 'customer@example.com',
          },
          messages: [
            {
              id: 'msg-1',
              ticketId: TICKET_ID,
              authorId: USER_ID,
              body: 'Customer visible',
              isInternal: false,
              createdAt: new Date('2026-07-18T08:14:00.000Z'),
              author: {
                id: USER_ID,
                fullName: 'Customer',
                role: Role.USER,
              },
            },
            {
              id: 'msg-2',
              ticketId: TICKET_ID,
              authorId: 'admin-1',
              body: 'Internal note',
              isInternal: true,
              createdAt: new Date('2026-07-18T09:00:00.000Z'),
              author: {
                id: 'admin-1',
                fullName: 'Staff',
                role: Role.ADMIN,
              },
            },
          ],
        }),
      );

      const result = await service.getAdmin(TICKET_ID);

      expect(result.id).toBe(TICKET_ID);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]).toMatchObject({
        body: 'Internal note',
        isInternal: true,
        sender: 'SUPPORT',
      });
    });

    it('getAdmin throws NotFound when ticket is missing', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.getAdmin(TICKET_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('assign moves SUBMITTED to IN_PROGRESS', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.SUBMITTED }),
      );
      prisma.user.findUnique.mockResolvedValue({ id: 'staff-1' });
      prisma.ticket.update.mockResolvedValue(
        baseTicket({
          status: TicketStatus.IN_PROGRESS,
          assigneeId: 'staff-1',
        }),
      );

      const result = await service.assign(TICKET_ID, 'staff-1');
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: TICKET_ID },
        data: {
          assigneeId: 'staff-1',
          status: TicketStatus.IN_PROGRESS,
        },
      });
    });

    it('resolve sets RESOLVED, resolvedAt, and autoCloseAt = now + graceDays', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.IN_PROGRESS }),
      );
      prisma.ticket.update.mockImplementation(async ({ data }) =>
        baseTicket({
          status: data.status,
          resolvedAt: data.resolvedAt,
          autoCloseAt: data.autoCloseAt,
        }),
      );

      const before = Date.now();
      const result = await service.resolve(TICKET_ID);
      const after = Date.now();

      expect(result.status).toBe(TicketStatus.RESOLVED);
      expect(result.resolvedAt).toBeInstanceOf(Date);
      expect(result.autoCloseAt).toBeInstanceOf(Date);

      const graceMs = 7 * 24 * 60 * 60 * 1000;
      const delta =
        (result.autoCloseAt as Date).getTime() -
        (result.resolvedAt as Date).getTime();
      expect(delta).toBe(graceMs);
      expect((result.resolvedAt as Date).getTime()).toBeGreaterThanOrEqual(
        before,
      );
      expect((result.resolvedAt as Date).getTime()).toBeLessThanOrEqual(after);
    });

    it('rejects resolve when already RESOLVED or CLOSED', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.RESOLVED }),
      );
      await expect(service.resolve(TICKET_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );

      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.CLOSED }),
      );
      await expect(service.resolve(TICKET_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('reopen moves RESOLVED to IN_PROGRESS and clears resolvedAt/autoCloseAt', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({
          status: TicketStatus.RESOLVED,
          resolvedAt: new Date('2026-07-17T10:28:00.000Z'),
          autoCloseAt: new Date('2026-07-24T10:28:00.000Z'),
        }),
      );
      prisma.ticket.update.mockResolvedValue(
        baseTicket({
          status: TicketStatus.IN_PROGRESS,
          resolvedAt: null,
          autoCloseAt: null,
        }),
      );

      const result = await service.reopen(TICKET_ID);
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: TICKET_ID },
        data: {
          status: TicketStatus.IN_PROGRESS,
          resolvedAt: null,
          autoCloseAt: null,
        },
      });
    });

    it('rejects reopen when status is not RESOLVED', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.CLOSED }),
      );
      await expect(service.reopen(TICKET_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects addAdminMessage when RESOLVED or CLOSED', async () => {
      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.RESOLVED }),
      );
      await expect(
        service.addAdminMessage('admin-1', TICKET_ID, { body: 'follow-up' }),
      ).rejects.toBeInstanceOf(ConflictException);

      prisma.ticket.findUnique.mockResolvedValue(
        baseTicket({ status: TicketStatus.CLOSED }),
      );
      await expect(
        service.addAdminMessage('admin-1', TICKET_ID, { body: 'follow-up' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.ticketMessage.create).not.toHaveBeenCalled();
    });

    it('addAdminMessage can create isInternal true without leaking via customer get', async () => {
      prisma.ticket.findUnique
        .mockResolvedValueOnce(baseTicket({ status: TicketStatus.IN_PROGRESS }))
        .mockResolvedValueOnce(
          baseTicket({
            status: TicketStatus.IN_PROGRESS,
            messages: [
              {
                id: 'msg-public',
                ticketId: TICKET_ID,
                authorId: USER_ID,
                body: 'Visible to customer',
                isInternal: false,
                createdAt: new Date('2026-07-18T08:14:00.000Z'),
                author: {
                  id: USER_ID,
                  fullName: 'Customer',
                  role: Role.USER,
                },
              },
            ],
          }),
        );
      prisma.ticketMessage.create.mockResolvedValue({
        id: 'msg-internal',
        ticketId: TICKET_ID,
        authorId: 'admin-1',
        body: 'Internal only',
        isInternal: true,
        createdAt: new Date('2026-07-20T12:00:00.000Z'),
      });
      tenantAccess.requireMembership.mockResolvedValue({});

      const internal = await service.addAdminMessage('admin-1', TICKET_ID, {
        body: 'Internal only',
        isInternal: true,
      });
      expect(internal.isInternal).toBe(true);

      const detail = await service.getForUser(USER_ID, TICKET_ID);
      expect(detail.messages.every((message) => message.body !== 'Internal only')).toBe(
        true,
      );
      expect(prisma.ticket.findUnique).toHaveBeenLastCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            messages: expect.objectContaining({
              where: { isInternal: false },
            }),
          }),
        }),
      );
    });
  });

  describe('not found paths', () => {
    it('throws NotFound when ticket missing on get', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);
      await expect(
        service.getForUser(USER_ID, TICKET_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
