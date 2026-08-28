import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IdempotencyService } from '#/common/idempotency/idempotency.service.js';
import { CommercialAuthorizationService } from '#/common/tenancy/commercial-authorization.service.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import {
  ComplementaryAuthorizationState,
  ComplementaryEngagementPreference,
  ComplementaryRequestStatus,
  ComplementaryWebsiteResolutionState,
  ComplementaryWebsiteTargetType,
  BillingInterval,
  WebsiteManagementCoverage,
} from '#/generated/prisma/enums.js';
import { BillingService } from '#/modules/billing/services/billing.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

import { ComplementaryServicesService } from './complementary-services.service.js';

const REQUEST_ID = 'request-1';
const TENANT_ID = 'tenant-1';
const OTHER_TENANT_ID = 'tenant-2';
const USER_ID = 'user-1';
const WEBSITE_ID = 'website-1';

function baseRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    catalogItemId: 'catalog-1',
    status: ComplementaryRequestStatus.SUBMITTED,
    contactName: 'Test User',
    contactPhone: '+989120000000',
    contactEmail: null,
    details: 'A sufficiently detailed complementary service request.',
    title: 'SEO audit',
    engagementPreference: ComplementaryEngagementPreference.ONE_TIME,
    scope: null,
    tenantId: TENANT_ID,
    websiteId: null,
    websiteDomain: 'example.com',
    websiteTargetType: ComplementaryWebsiteTargetType.TYPED_DOMAIN,
    websiteCoverageSnapshot: WebsiteManagementCoverage.EXTERNAL_INFRASTRUCTURE,
    websiteResolutionState:
      ComplementaryWebsiteResolutionState.PENDING_ACCEPTANCE,
    authorizationState: ComplementaryAuthorizationState.AUTHORIZED,
    createdByUserId: USER_ID,
    withdrawnAt: null,
    acceptedAt: null,
    catalogItem: { id: 'catalog-1', code: 'SEO' },
    tenant: { id: TENANT_ID },
    website: null,
    quotations: [],
    assignments: [],
    createdByUser: {
      id: USER_ID,
      fullName: 'Test User',
      phoneNumber: '+989120000000',
      email: null,
    },
    ...overrides,
  };
}

function externalWebsite(tenantId = TENANT_ID) {
  return {
    id: WEBSITE_ID,
    tenantId,
    userId: USER_ID,
    domain: 'example.com',
    displayName: 'example.com',
    managementCoverage: WebsiteManagementCoverage.EXTERNAL_INFRASTRUCTURE,
    planId: null,
    planActivatedAt: null,
  };
}

describe('ComplementaryServicesService website target lifecycle', () => {
  let service: ComplementaryServicesService;

  const prisma = {
    serviceCatalogItem: {
      findFirst: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
    },
    complementaryServiceRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    website: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    serviceAssignment: {
      create: vi.fn(),
    },
    auditRecord: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const tenantAccess = {
    getMembershipsForUser: vi.fn(),
    getAccessibleTenantIds: vi.fn(),
    requireMembership: vi.fn(),
  };
  const idempotency = {
    beginOrReplay: vi.fn(),
  };
  const billing = {
    createComplementaryItem: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    prisma.auditRecord.create.mockResolvedValue({ id: 'audit-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplementaryServicesService,
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
        { provide: BillingService, useValue: billing },
      ],
    }).compile();

    service = module.get(ComplementaryServicesService);
  });

  it('replays an authenticated create request with the same idempotency key', async () => {
    const replayed = baseRequest();
    idempotency.beginOrReplay.mockResolvedValue(replayed);

    const result = await service.createForUser(
      {
        id: USER_ID,
        sub: USER_ID,
        fullName: 'Test User',
        phoneNumber: '+989120000000',
        email: null,
      } as never,
      {
        catalogItemId: 'catalog-1',
        websiteDomain: 'example.com',
        engagementPreference: ComplementaryEngagementPreference.ONE_TIME,
        title: 'SEO audit',
        description: 'A sufficiently detailed complementary service request.',
      },
      'create-key-1',
    );

    expect(idempotency.beginOrReplay).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'create-key-1',
        scope: 'complementary-request.create:' + USER_ID,
        actorId: USER_ID,
        execute: expect.any(Function),
      }),
    );
    expect(prisma.complementaryServiceRequest.create).not.toHaveBeenCalled();
    expect(result).toBe(replayed);
  });
  it('stores a typed domain on the request without creating a Website', async () => {
    const created = baseRequest({
      tenantId: null,
      authorizationState: ComplementaryAuthorizationState.NOT_AUTHORIZED,
    });
    prisma.serviceCatalogItem.findFirst.mockResolvedValue({
      id: 'catalog-1',
      isPublished: true,
    });
    tenantAccess.getMembershipsForUser.mockResolvedValue([]);
    prisma.website.findUnique.mockResolvedValue(null);
    prisma.complementaryServiceRequest.create.mockResolvedValue(created);

    const result = await service.createForUser(
      {
        id: USER_ID,
        sub: USER_ID,
        fullName: 'Test User',
        phoneNumber: '+989120000000',
        email: null,
      } as never,
      {
        catalogItemId: 'catalog-1',
        websiteDomain: 'https://www.example.com/path',
        engagementPreference: ComplementaryEngagementPreference.ONE_TIME,
        title: 'SEO audit',
        description: 'A sufficiently detailed complementary service request.',
      },
    );

    expect(prisma.website.create).not.toHaveBeenCalled();
    expect(prisma.complementaryServiceRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          websiteId: null,
          websiteDomain: 'example.com',
          websiteTargetType: ComplementaryWebsiteTargetType.TYPED_DOMAIN,
          websiteResolutionState:
            ComplementaryWebsiteResolutionState.PENDING_ACCEPTANCE,
        }),
      }),
    );
    expect(result.websiteDomain).toBe('example.com');
  });

  it('acceptance creates exactly one planless external Website and links it', async () => {
    prisma.complementaryServiceRequest.findUnique.mockResolvedValue(
      baseRequest(),
    );
    prisma.website.findUnique.mockResolvedValue(null);
    prisma.website.create.mockResolvedValue(externalWebsite());
    prisma.complementaryServiceRequest.update.mockResolvedValue(
      baseRequest({
        status: ComplementaryRequestStatus.ACCEPTED,
        websiteId: WEBSITE_ID,
        website: externalWebsite(),
        websiteResolutionState: ComplementaryWebsiteResolutionState.LINKED,
      }),
    );

    const result = await service.acceptRequest(REQUEST_ID, 'staff-1');

    expect(prisma.website.create).toHaveBeenCalledOnce();
    expect(prisma.website.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TENANT_ID,
        domain: 'example.com',
        managementCoverage: WebsiteManagementCoverage.EXTERNAL_INFRASTRUCTURE,
      }),
    });
    expect(prisma.website.create.mock.calls[0][0].data).not.toHaveProperty(
      'planId',
    );
    expect(result.websiteId).toBe(WEBSITE_ID);
  });

  it('acceptance reuses a same-tenant Website instead of creating another', async () => {
    prisma.complementaryServiceRequest.findUnique.mockResolvedValue(
      baseRequest(),
    );
    prisma.website.findUnique.mockResolvedValue(externalWebsite());
    prisma.complementaryServiceRequest.update.mockResolvedValue(
      baseRequest({
        status: ComplementaryRequestStatus.ACCEPTED,
        websiteId: WEBSITE_ID,
      }),
    );

    await service.acceptRequest(REQUEST_ID, 'staff-1');

    expect(prisma.website.create).not.toHaveBeenCalled();
    expect(prisma.complementaryServiceRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          websiteId: WEBSITE_ID,
          websiteResolutionState: ComplementaryWebsiteResolutionState.LINKED,
        }),
      }),
    );
  });

  it('accepts without a tenant as domain-only and creates no Website', async () => {
    prisma.complementaryServiceRequest.findUnique.mockResolvedValue(
      baseRequest({
        tenantId: null,
        authorizationState: ComplementaryAuthorizationState.NOT_AUTHORIZED,
      }),
    );
    prisma.complementaryServiceRequest.update.mockResolvedValue(
      baseRequest({
        tenantId: null,
        status: ComplementaryRequestStatus.ACCEPTED,
        websiteResolutionState:
          ComplementaryWebsiteResolutionState.DEFERRED_NO_TENANT,
        authorizationState: ComplementaryAuthorizationState.NOT_AUTHORIZED,
      }),
    );

    await service.acceptRequest(REQUEST_ID, 'staff-1');

    expect(prisma.website.findUnique).not.toHaveBeenCalled();
    expect(prisma.website.create).not.toHaveBeenCalled();
    expect(prisma.complementaryServiceRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          websiteId: null,
          websiteResolutionState:
            ComplementaryWebsiteResolutionState.DEFERRED_NO_TENANT,
        }),
      }),
    );
  });

  it('returns a generic conflict for a cross-tenant domain and writes nothing', async () => {
    prisma.complementaryServiceRequest.findUnique.mockResolvedValue(
      baseRequest(),
    );
    prisma.website.findUnique.mockResolvedValue(
      externalWebsite(OTHER_TENANT_ID),
    );

    await expect(
      service.acceptRequest(REQUEST_ID, 'staff-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.website.create).not.toHaveBeenCalled();
    expect(prisma.complementaryServiceRequest.update).not.toHaveBeenCalled();
    expect(prisma.auditRecord.create).not.toHaveBeenCalled();
  });

  it('activates a domain-only assignment without changing Website plans', async () => {
    prisma.complementaryServiceRequest.findUnique.mockResolvedValue(
      baseRequest({
        tenantId: TENANT_ID,
        websiteId: WEBSITE_ID,
        status: ComplementaryRequestStatus.ACCEPTED,
        websiteResolutionState: ComplementaryWebsiteResolutionState.LINKED,
        authorizationState: ComplementaryAuthorizationState.NOT_AUTHORIZED,
        catalogItem: {
          id: 'catalog-1',
          code: 'SEO',
          nameFa: 'سئو',
          nameEn: 'SEO',
        },
      }),
    );
    prisma.serviceAssignment.create.mockResolvedValue({
      id: 'assignment-1',
      requestId: REQUEST_ID,
      authorizationState:
        ComplementaryAuthorizationState.NOT_AUTHORIZED_AT_ACTIVATION,
    });
    prisma.complementaryServiceRequest.update.mockResolvedValue({});

    const result = await service.createAssignment({
      requestId: REQUEST_ID,
      amount: 5_000_000,
      interval: BillingInterval.NONE,
    });

    expect(result.authorizationState).toBe(
      ComplementaryAuthorizationState.NOT_AUTHORIZED_AT_ACTIVATION,
    );
    expect(prisma.website.update).not.toHaveBeenCalled();
    expect(billing.createComplementaryItem).toHaveBeenCalledOnce();
  });
});
