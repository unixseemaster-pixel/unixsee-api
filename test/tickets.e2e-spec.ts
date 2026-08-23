import {
  CanActivate,
  ExecutionContext,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalExceptionFilter } from '#/common/http/filters/global-exception.filter.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import {
  Role,
  TicketPriority,
  TicketServiceCategory,
  TicketStatus,
} from '#/generated/prisma/enums.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

import { AdminTicketsController } from '../src/modules/tickets/controllers/admin-tickets.controller.js';
import { TicketsController } from '../src/modules/tickets/controllers/tickets.controller.js';
import { TicketNumberService } from '../src/modules/tickets/services/ticket-number.service.js';
import { TicketsService } from '../src/modules/tickets/services/tickets.service.js';

const USER_ID = 'user-e2e-1';
const ADMIN_ID = 'admin-e2e-1';
const TENANT_ID = 'tenant-e2e-1';
const TICKET_ID = 'ticket-e2e-1';

let currentTestUser: { id: string; role: Role } = {
  id: USER_ID,
  role: Role.USER,
};

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = currentTestUser;
    return true;
  }
}

function baseTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: TICKET_ID,
    tenantId: TENANT_ID,
    websiteId: null,
    createdById: USER_ID,
    assigneeId: null,
    number: 'TCK-2000',
    subject: 'E2E ticket',
    service: TicketServiceCategory.GRAPHIC_DESIGN,
    status: TicketStatus.IN_PROGRESS,
    priority: TicketPriority.NORMAL,
    resolvedAt: null,
    autoCloseAt: null,
    createdAt: new Date('2026-07-18T08:14:00.000Z'),
    updatedAt: new Date('2026-07-19T15:20:00.000Z'),
    website: null,
    messages: [
      {
        id: 'msg-1',
        ticketId: TICKET_ID,
        authorId: USER_ID,
        body: 'Initial description that is long enough.',
        isInternal: false,
        createdAt: new Date('2026-07-18T08:14:00.000Z'),
        author: { id: USER_ID, fullName: 'Customer', role: Role.USER },
      },
    ],
    attachments: [],
    ...overrides,
  };
}

describe('TicketsModule (e2e)', () => {
  let app: INestApplication;

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

  const ticketNumbers = {
    allocate: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController, AdminTicketsController],
      providers: [
        TicketsService,
        RolesGuard,
        Reflector,
        { provide: APP_GUARD, useClass: TestAuthGuard },
        { provide: PrismaService, useValue: prisma },
        { provide: TenantAccessService, useValue: tenantAccess },
        { provide: TicketNumberService, useValue: ticketNumbers },
        {
          provide: ConfigService,
          useValue: {
            get: () => ({
              tickets: {
                autoCloseEnabled: true,
                autoCloseGraceDays: 7,
                autoCloseCronExpression: '0 * * * *',
              },
            }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    currentTestUser = { id: USER_ID, role: Role.USER };
    prisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.all(arg as Promise<unknown>[]);
    });
    tenantAccess.requireMembership.mockResolvedValue({});
    tenantAccess.resolvePrimaryTenantId.mockResolvedValue(TENANT_ID);
    tenantAccess.getAccessibleTenantIds.mockResolvedValue([TENANT_ID]);
  });

  describe('Customer tickets HTTP', () => {
    it('GET /api/v1/tickets/services returns catalog', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tickets/services')
        .expect(200);

      expect(res.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: TicketServiceCategory.WOOCOMMERCE_SUPPORT,
            websiteRequired: false,
          }),
          expect.objectContaining({
            code: TicketServiceCategory.GRAPHIC_DESIGN,
            websiteRequired: false,
          }),
        ]),
      );
    });

    it('POST /api/v1/tickets rejects description shorter than 20 chars', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .send({
          service: TicketServiceCategory.GRAPHIC_DESIGN,
          subject: 'Short',
          description: 'too short',
        })
        .expect(400);

      expect(prisma.ticket.create).not.toHaveBeenCalled();
    });

    it('POST /api/v1/tickets/:id/messages accepts idempotencyKey and does not duplicate', async () => {
      prisma.ticket.findUnique.mockResolvedValue(baseTicket());
      prisma.ticketMessage.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'msg-idem',
          ticketId: TICKET_ID,
          authorId: USER_ID,
          body: 'Retry-safe customer message body.',
          isInternal: false,
          createdAt: new Date('2026-07-20T10:00:00.000Z'),
          author: { id: USER_ID, fullName: 'Customer', role: Role.USER },
        });
      prisma.ticketMessage.create.mockResolvedValue({
        id: 'msg-idem',
        ticketId: TICKET_ID,
        authorId: USER_ID,
        body: 'Retry-safe customer message body.',
        isInternal: false,
        createdAt: new Date('2026-07-20T10:00:00.000Z'),
        author: { id: USER_ID, fullName: 'Customer', role: Role.USER },
      });
      prisma.ticket.update.mockResolvedValue({});

      const first = await request(app.getHttpServer())
        .post(`/api/v1/tickets/${TICKET_ID}/messages`)
        .send({
          body: 'Retry-safe customer message body.',
          idempotencyKey: 'e2e-K1',
        })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post(`/api/v1/tickets/${TICKET_ID}/messages`)
        .send({
          body: 'Retry-safe customer message body.',
          idempotencyKey: 'e2e-K1',
        })
        .expect(201);

      expect(first.body.data.id).toBe('msg-idem');
      expect(second.body.data.id).toBe('msg-idem');
      expect(prisma.ticketMessage.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Admin tickets HTTP', () => {
    it('rejects non-ADMIN/OPERATOR on /api/v1/admin/tickets', async () => {
      currentTestUser = { id: USER_ID, role: Role.USER };

      await request(app.getHttpServer())
        .get('/api/v1/admin/tickets')
        .expect(403);
    });

    it('POST /api/v1/admin/tickets/:id/resolve reaches service', async () => {
      currentTestUser = { id: ADMIN_ID, role: Role.ADMIN };
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

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/tickets/${TICKET_ID}/resolve`)
        .expect(200);

      expect(res.body.data.status).toBe(TicketStatus.RESOLVED);
      expect(prisma.ticket.update).toHaveBeenCalled();
    });

    it('POST /api/v1/admin/tickets/:id/reopen reaches service', async () => {
      currentTestUser = { id: ADMIN_ID, role: Role.ADMIN };
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

      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/tickets/${TICKET_ID}/reopen`)
        .expect(200);

      expect(res.body.data.status).toBe(TicketStatus.IN_PROGRESS);
    });
  });
});
