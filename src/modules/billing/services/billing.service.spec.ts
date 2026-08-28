import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IdempotencyService } from '#/common/idempotency/idempotency.service.js';
import { CommercialAuthorizationService } from '#/common/tenancy/commercial-authorization.service.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import { AuditService } from '#/modules/audit/services/audit.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import {
  BillingCommercialModel,
  BillingInterval,
  BillingItemKind,
  BillingItemStatus,
} from '#/generated/prisma/enums.js';

import { BillingService } from './billing.service.js';

const WEBSITE_ID = 'website-1';
const TENANT_ID = 'tenant-1';
const PLAN_ID = 'plan-1';
const ACTOR_ID = 'staff-1';
const ITEM_ID = 'billing-1';

describe('BillingService', () => {
  let service: BillingService;

  const prisma = {
    website: { findUnique: vi.fn() },
    plan: { findUnique: vi.fn() },
    billingItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    billingPeriodRow: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  const tenantAccess = {
    assertWebsiteAccess: vi.fn(),
    getAccessibleTenantIds: vi.fn(),
  };
  const audit = { record: vi.fn() };
  const idempotency = {
    beginOrReplay: vi.fn(async ({ execute }: { execute: () => unknown }) =>
      execute(),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => fn(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantAccessService, useValue: tenantAccess },
        {
          provide: CommercialAuthorizationService,
          useValue: {
            assertAuthorizedOrConfirmed: vi.fn().mockResolvedValue({
              principalUserId: 'user-1',
              authorized: true,
              overridden: false,
            }),
          },
        },
        { provide: AuditService, useValue: audit },
        { provide: IdempotencyService, useValue: idempotency },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  it('creates a managed plan billing item with activation period', async () => {
    prisma.billingItem.findFirst.mockResolvedValue(null);
    prisma.billingItem.create.mockResolvedValue({
      id: ITEM_ID,
      kind: BillingItemKind.MANAGED_PLAN,
      status: BillingItemStatus.ACTIVE,
    });

    await service.createManagedPlanItem(prisma as never, {
      tenantId: TENANT_ID,
      websiteId: WEBSITE_ID,
      planId: PLAN_ID,
      labelSnapshot: 'Unix Scale',
      actorId: ACTOR_ID,
      terms: {
        amount: 1_000_000,
        interval: BillingInterval.YEARLY,
        commercialModel: BillingCommercialModel.RECURRING_RETAINER,
      },
    });

    expect(prisma.billingItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: BillingItemKind.MANAGED_PLAN,
          amount: 1_000_000,
          interval: BillingInterval.YEARLY,
          currency: 'IRR',
        }),
      }),
    );
  });

  it('rejects a second active managed plan on the same website', async () => {
    prisma.billingItem.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createManagedPlanItem(prisma as never, {
        tenantId: TENANT_ID,
        websiteId: WEBSITE_ID,
        planId: PLAN_ID,
        labelSnapshot: 'Unix Scale',
        terms: {
          amount: 100,
          interval: BillingInterval.MONTHLY,
        },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects renew when interval is NONE', async () => {
    prisma.billingItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      status: BillingItemStatus.ACTIVE,
      interval: BillingInterval.NONE,
      periods: [],
    });

    await expect(service.renew(ITEM_ID, ACTOR_ID)).rejects.toBeInstanceOf(
      Error,
    );
  });

  it('expires overdue active recurring items', async () => {
    prisma.billingItem.updateMany.mockResolvedValue({ count: 2 });
    const count = await service.expireOverdue(new Date('2027-01-01T00:00:00Z'));
    expect(count).toBe(2);
    expect(prisma.billingItem.updateMany).toHaveBeenCalled();
  });

  it('lists tenant billing items for the customer hub', async () => {
    tenantAccess.getAccessibleTenantIds.mockResolvedValue([TENANT_ID]);
    prisma.billingItem.findMany.mockResolvedValue([
      {
        id: ITEM_ID,
        kind: BillingItemKind.MANAGED_PLAN,
        status: BillingItemStatus.ACTIVE,
        website: { id: WEBSITE_ID, domain: 'shop.example', displayName: null },
      },
    ]);

    const result = await service.listBillingForUser(ACTOR_ID);

    expect(result.items).toHaveLength(1);
    expect(prisma.billingItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: { in: [TENANT_ID] },
        }),
      }),
    );
  });

  it('returns empty billing hub when the user has no tenant membership', async () => {
    tenantAccess.getAccessibleTenantIds.mockResolvedValue([]);
    const result = await service.listBillingForUser(ACTOR_ID);
    expect(result.items).toEqual([]);
    expect(prisma.billingItem.findMany).not.toHaveBeenCalled();
  });
});
