import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommercialAuthorizationService } from '#/common/tenancy/commercial-authorization.service.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import { BillingInterval } from '#/generated/prisma/enums.js';
import { BillingService } from '#/modules/billing/services/billing.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

import { WebsitesService } from './websites.service.js';

const WEBSITE_ID = 'website-1';
const TENANT_ID = 'tenant-1';
const PLAN_ID = 'plan-core';

function website(planActivatedAt: Date | null = null) {
  return {
    id: WEBSITE_ID,
    tenantId: TENANT_ID,
    domain: 'example.com',
    planId: PLAN_ID,
    planActivatedAt,
  };
}

describe('WebsitesService plan assignment', () => {
  let service: WebsitesService;

  const prisma = {
    website: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const tenantAccess = {
    getAccessibleTenantIds: vi.fn(),
  };
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
        WebsitesService,
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
        { provide: BillingService, useValue: billing },
      ],
    }).compile();

    service = module.get(WebsitesService);
  });

  it('links a selected plan without activating it by default', async () => {
    prisma.website.create.mockResolvedValue(website());

    await service.createAdmin({
      tenantId: TENANT_ID,
      domain: 'example.com',
      planId: PLAN_ID,
    });

    expect(prisma.website.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        planId: PLAN_ID,
        planActivatedAt: null,
      }),
    });
    expect(billing.createManagedPlanItem).not.toHaveBeenCalled();
  });

  it('activates a selected plan only when explicitly requested', async () => {
    prisma.website.create.mockResolvedValue(website(new Date()));
    prisma.plan.findUnique.mockResolvedValue({
      id: PLAN_ID,
      nameFa: 'پلن',
      nameEn: 'Plan',
      code: 'CORE',
    });

    await service.createAdmin({
      tenantId: TENANT_ID,
      domain: 'example.com',
      planId: PLAN_ID,
      activatePlan: true,
      amount: 1_000_000,
      interval: BillingInterval.YEARLY,
    });

    expect(prisma.website.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        planId: PLAN_ID,
        planActivatedAt: expect.any(Date),
      }),
    });
    expect(billing.createManagedPlanItem).toHaveBeenCalledOnce();
  });

  it('rejects activation when no plan is selected', async () => {
    await expect(
      service.createAdmin({
        tenantId: TENANT_ID,
        domain: 'example.com',
        activatePlan: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.website.create).not.toHaveBeenCalled();
  });

  it('rejects activation without commercial terms', async () => {
    await expect(
      service.createAdmin({
        tenantId: TENANT_ID,
        domain: 'example.com',
        planId: PLAN_ID,
        activatePlan: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.website.create).not.toHaveBeenCalled();
  });

  it('keeps an assigned plan inactive', async () => {
    prisma.website.findUnique.mockResolvedValue(website(new Date()));
    prisma.website.update.mockResolvedValue(website());

    await service.assign(WEBSITE_ID, {
      tenantId: TENANT_ID,
      planId: PLAN_ID,
    });

    expect(prisma.website.update).toHaveBeenCalledWith({
      where: { id: WEBSITE_ID },
      data: expect.objectContaining({
        tenantId: TENANT_ID,
        planId: PLAN_ID,
        planActivatedAt: null,
      }),
    });
  });

  it('exposes a complete agent-provided 24-hour visitor snapshot', async () => {
    tenantAccess.getAccessibleTenantIds.mockResolvedValue([TENANT_ID]);
    prisma.website.findMany.mockResolvedValue([
      {
        ...website(new Date()),
        managementCoverage: 'UNIXSEE_MANAGED',
        trafficSnapshots: [
          {
            uniqueVisitors24h: 487,
            visitors24hWindowSeconds: 86_400,
            visitors24hCoverageSeconds: 86_400,
            visitors24hMeasuredAt: new Date('2026-08-25T12:00:00.000Z'),
            visitors24hStatus: { state: 'ok' },
          },
        ],
      },
    ]);

    const result = await service.getUserWebsites('user-1');

    expect(result).toEqual([
      expect.objectContaining({
        id: WEBSITE_ID,
        visitors24h: {
          uniqueVisitors: 487,
          windowSeconds: 86_400,
          coverageSeconds: 86_400,
          measuredAt: new Date('2026-08-25T12:00:00.000Z'),
          status: 'READY',
        },
      }),
    ]);
    expect(result[0]).not.toHaveProperty('trafficSnapshots');
  });

  it('does not present partial or external traffic as a complete 24-hour value', async () => {
    tenantAccess.getAccessibleTenantIds.mockResolvedValue([TENANT_ID]);
    const warmingSnapshot = {
      uniqueVisitors24h: 42,
      visitors24hWindowSeconds: 86_400,
      visitors24hCoverageSeconds: 3_600,
      visitors24hMeasuredAt: new Date('2026-08-25T12:00:00.000Z'),
      visitors24hStatus: { state: 'unknown', reason: 'warming_up' },
    };
    prisma.website.findMany.mockResolvedValue([
      {
        ...website(),
        id: 'managed-warming',
        managementCoverage: 'UNIXSEE_MANAGED',
        trafficSnapshots: [warmingSnapshot],
      },
      {
        ...website(),
        id: 'external-site',
        managementCoverage: 'EXTERNAL_INFRASTRUCTURE',
        trafficSnapshots: [
          { ...warmingSnapshot, visitors24hCoverageSeconds: 86_400 },
        ],
      },
    ]);

    const result = await service.getUserWebsites('user-1');

    expect(result[0]?.visitors24h).toEqual(
      expect.objectContaining({
        uniqueVisitors: null,
        status: 'COLLECTING',
      }),
    );
    expect(result[1]?.visitors24h).toBeNull();
  });
});
