import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IdempotencyService } from '#/common/idempotency/idempotency.service.js';
import { CommercialAuthorizationService } from '#/common/tenancy/commercial-authorization.service.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import {
  BillingInterval,
  PlanRequestStatus,
} from '#/generated/prisma/enums.js';
import { BillingService } from '#/modules/billing/services/billing.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { UsersService } from '#/modules/users/services/users.service.js';

import { PlanRequestsService } from './plan-requests.service.js';

const REQUEST_ID = 'request-1';
const WEBSITE_ID = 'website-1';
const TENANT_ID = 'tenant-1';
const ACTOR_ID = 'staff-1';
const REQUESTED_PLAN_ID = 'plan-core';
const OTHER_PLAN_ID = 'plan-peak';

const commercialTerms = {
  amount: 12_000_000,
  interval: BillingInterval.YEARLY,
};

function baseRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    planId: REQUESTED_PLAN_ID,
    status: PlanRequestStatus.SUBMITTED,
    tenantId: TENANT_ID,
    linkedUserId: 'user-1',
    websiteId: null,
    enabledAt: null,
    plan: {
      id: REQUESTED_PLAN_ID,
      nameFa: 'پلن',
      nameEn: 'Plan',
      code: 'CORE',
    },
    tenant: { id: TENANT_ID },
    linkedUser: { id: 'user-1' },
    website: null,
    ...overrides,
  };
}

function baseWebsite(
  planId: string | null,
  planActivatedAt: Date | null = null,
) {
  return {
    id: WEBSITE_ID,
    tenantId: TENANT_ID,
    planId,
    planActivatedAt,
  };
}
describe('PlanRequestsService.enable', () => {
  let service: PlanRequestsService;

  const prisma = {
    planRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    website: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const tenantAccess = {};
  const idempotency = {
    beginOrReplay: vi.fn(),
  };
  const usersService = {};
  const billing = {
    createManagedPlanItem: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanRequestsService,
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
        { provide: IdempotencyService, useValue: idempotency },
        { provide: UsersService, useValue: usersService },
        { provide: BillingService, useValue: billing },
      ],
    }).compile();

    service = module.get(PlanRequestsService);
  });

  it('rejects a website that already has a different active plan', async () => {
    prisma.planRequest.findUnique.mockResolvedValue(baseRequest());
    prisma.website.findUnique.mockResolvedValue(
      baseWebsite(OTHER_PLAN_ID, new Date('2026-08-23T08:00:00.000Z')),
    );

    await expect(
      service.enable(REQUEST_ID, ACTOR_ID, {
        websiteId: WEBSITE_ID,
        tenantId: TENANT_ID,
        ...commercialTerms,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.website.update).not.toHaveBeenCalled();
    expect(prisma.planRequest.update).not.toHaveBeenCalled();
  });

  it('assigns the requested plan to a planless website atomically', async () => {
    const enabledRequest = baseRequest({
      status: PlanRequestStatus.ENABLED,
      websiteId: WEBSITE_ID,
      website: baseWebsite(REQUESTED_PLAN_ID),
      enabledAt: new Date('2026-08-24T08:00:00.000Z'),
    });
    prisma.planRequest.findUnique.mockResolvedValue(baseRequest());
    prisma.website.findUnique.mockResolvedValue(baseWebsite(null));
    prisma.website.update.mockResolvedValue(baseWebsite(REQUESTED_PLAN_ID));
    prisma.planRequest.update.mockResolvedValue(enabledRequest);

    const result = await service.enable(REQUEST_ID, ACTOR_ID, {
      websiteId: WEBSITE_ID,
      tenantId: TENANT_ID,
      ...commercialTerms,
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.website.update).toHaveBeenCalledWith({
      where: { id: WEBSITE_ID },
      data: {
        planId: REQUESTED_PLAN_ID,
        planActivatedAt: expect.any(Date),
      },
    });
    expect(billing.createManagedPlanItem).toHaveBeenCalledOnce();
    expect(prisma.planRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: REQUEST_ID },
        data: expect.objectContaining({
          status: PlanRequestStatus.ENABLED,
          tenantId: TENANT_ID,
          websiteId: WEBSITE_ID,
          enabledAt: expect.any(Date),
        }),
      }),
    );
    expect(result.status).toBe(PlanRequestStatus.ENABLED);
  });

  it('replaces an inactive linked plan and activates the requested plan', async () => {
    const enabledRequest = baseRequest({
      status: PlanRequestStatus.ENABLED,
      websiteId: WEBSITE_ID,
      website: baseWebsite(
        REQUESTED_PLAN_ID,
        new Date('2026-08-24T08:00:00.000Z'),
      ),
      enabledAt: new Date('2026-08-24T08:00:00.000Z'),
    });
    prisma.planRequest.findUnique.mockResolvedValue(baseRequest());
    prisma.website.findUnique.mockResolvedValue(baseWebsite(OTHER_PLAN_ID));
    prisma.website.update.mockResolvedValue(
      baseWebsite(REQUESTED_PLAN_ID, new Date('2026-08-24T08:00:00.000Z')),
    );
    prisma.planRequest.update.mockResolvedValue(enabledRequest);

    const result = await service.enable(REQUEST_ID, ACTOR_ID, {
      websiteId: WEBSITE_ID,
      tenantId: TENANT_ID,
      ...commercialTerms,
    });

    expect(prisma.website.update).toHaveBeenCalledWith({
      where: { id: WEBSITE_ID },
      data: {
        planId: REQUESTED_PLAN_ID,
        planActivatedAt: expect.any(Date),
      },
    });
    expect(billing.createManagedPlanItem).toHaveBeenCalledOnce();
    expect(result.status).toBe(PlanRequestStatus.ENABLED);
  });

  it('allows completion when the website already has the requested plan', async () => {
    const enabledRequest = baseRequest({
      status: PlanRequestStatus.ENABLED,
      websiteId: WEBSITE_ID,
      website: baseWebsite(
        REQUESTED_PLAN_ID,
        new Date('2026-08-23T08:00:00.000Z'),
      ),
      enabledAt: new Date('2026-08-24T08:00:00.000Z'),
    });
    prisma.planRequest.findUnique.mockResolvedValue(baseRequest());
    prisma.website.findUnique.mockResolvedValue(
      baseWebsite(REQUESTED_PLAN_ID, new Date('2026-08-23T08:00:00.000Z')),
    );
    prisma.planRequest.update.mockResolvedValue(enabledRequest);

    const result = await service.enable(REQUEST_ID, ACTOR_ID, {
      websiteId: WEBSITE_ID,
      tenantId: TENANT_ID,
      ...commercialTerms,
    });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.website.update).not.toHaveBeenCalled();
    expect(billing.createManagedPlanItem).not.toHaveBeenCalled();
    expect(result.status).toBe(PlanRequestStatus.ENABLED);
  });
});
