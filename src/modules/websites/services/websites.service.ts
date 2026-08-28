import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { CommercialAuthorizationService } from '#/common/tenancy/commercial-authorization.service.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import {
  BillingCommercialModel,
  BillingCommercialState,
  BillingInterval,
  MembershipRole,
  WebsiteLifecycleStatus,
  WebsiteManagementCoverage,
} from '#/generated/prisma/enums.js';
import { BillingService } from '#/modules/billing/services/billing.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

type Visitors24hSnapshot = {
  uniqueVisitors24h: number | null;
  visitors24hWindowSeconds: number | null;
  visitors24hCoverageSeconds: number | null;
  visitors24hMeasuredAt: Date | null;
  visitors24hStatus: unknown;
};

@Injectable()
export class WebsitesService {
  private readonly logger = createAppLogger(WebsitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly commercialAuth: CommercialAuthorizationService,
    private readonly billing: BillingService,
  ) {}

  async getUserWebsites(userId: string) {
    const tenantIds = await this.tenantAccess.getAccessibleTenantIds(userId);
    const websites = await this.prisma.website.findMany({
      where: { tenantId: { in: tenantIds } },
      include: {
        plan: { select: { id: true, code: true, nameEn: true } },
        trafficSnapshots: {
          where: { visitors24hMeasuredAt: { not: null } },
          orderBy: { visitors24hMeasuredAt: 'desc' },
          take: 1,
          select: {
            uniqueVisitors24h: true,
            visitors24hWindowSeconds: true,
            visitors24hCoverageSeconds: true,
            visitors24hMeasuredAt: true,
            visitors24hStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.debug('websites.user_list.loaded', {
      userId,
      count: websites.length,
    });

    return websites.map(({ trafficSnapshots, ...website }) => ({
      ...website,
      visitors24h: this.toCustomerVisitors24h(
        website.managementCoverage,
        trafficSnapshots[0],
      ),
    }));
  }

  async getWebsiteForUser(userId: string, websiteId: string) {
    await this.tenantAccess.assertWebsiteAccess(userId, websiteId);
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        ssl: true,
        plan: true,
        vpsNode: {
          select: {
            server: {
              select: { id: true, name: true, controlPanelUrl: true },
            },
          },
        },
      },
    });
    if (!website) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return website;
  }

  async listAdmin(params?: {
    skip?: number;
    take?: number;
    tenantId?: string;
    userId?: string;
    search?: string;
    managementCoverage?: WebsiteManagementCoverage;
  }) {
    let tenantFilter:
      | { tenantId: string }
      | { tenantId: { in: string[] } }
      | undefined;

    if (params?.userId) {
      const tenantIds = await this.tenantAccess.getAccessibleTenantIds(
        params.userId,
      );
      if (tenantIds.length === 0) {
        return { items: [], total: 0 };
      }
      tenantFilter = { tenantId: { in: tenantIds } };
    } else if (params?.tenantId) {
      tenantFilter = { tenantId: params.tenantId };
    }

    const where = {
      ...tenantFilter,
      ...(params?.managementCoverage
        ? { managementCoverage: params.managementCoverage }
        : {}),
      ...(params?.search
        ? {
            OR: [
              {
                domain: {
                  contains: params.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                displayName: {
                  contains: params.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.website.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true } },
          plan: { select: { id: true, code: true, nameEn: true } },
          vpsNode: {
            select: {
              id: true,
              status: true,
              agentVersion: true,
              lastHeartbeatAt: true,
              server: {
                select: { id: true, name: true, controlPanelUrl: true },
              },
            },
          },
          discoveries: {
            orderBy: { lastIngestedAt: 'desc' },
            take: 1,
            include: { trafficSnapshot: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.website.count({ where }),
    ]);

    return { items, total };
  }

  async getAdmin(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        tenant: { select: { id: true, name: true } },
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
          },
        },
        plan: { select: { id: true, code: true, nameEn: true } },
        vpsNode: {
          select: {
            id: true,
            status: true,
            agentVersion: true,
            lastHeartbeatAt: true,
            server: {
              select: { id: true, name: true, controlPanelUrl: true },
            },
          },
        },
        discoveries: {
          orderBy: { lastIngestedAt: 'desc' },
          take: 1,
          include: { trafficSnapshot: true },
        },
      },
    });
    if (!website) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    if (website.user) {
      return website;
    }

    const ownerMembership = await this.prisma.membership.findFirst({
      where: {
        tenantId: website.tenantId,
        role: MembershipRole.OWNER,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });

    return {
      ...website,
      user: ownerMembership?.user ?? null,
      userId: ownerMembership?.user?.id ?? website.userId,
    };
  }

  async updateAdmin(
    websiteId: string,
    input: {
      wordpressAdminUrl?: string | null;
      wordpressAdminUsername?: string | null;
      wordpressAdminPassword?: string | null;
      directAdminUrl?: string | null;
      directAdminUsername?: string | null;
      directAdminPassword?: string | null;
      managementCoverage?: WebsiteManagementCoverage;
    },
  ) {
    const exists = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true, managementCoverage: true },
    });
    if (!exists) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    const effectiveCoverage =
      input.managementCoverage ?? exists.managementCoverage;
    const isManaged =
      effectiveCoverage === WebsiteManagementCoverage.UNIXSEE_MANAGED;
    return this.prisma.website.update({
      where: { id: websiteId },
      data: {
        ...(isManaged
          ? {
              ...(input.wordpressAdminUrl !== undefined
                ? { wordpressAdminUrl: input.wordpressAdminUrl || null }
                : {}),
              ...(input.wordpressAdminUsername !== undefined
                ? {
                    wordpressAdminUsername:
                      input.wordpressAdminUsername || null,
                  }
                : {}),
              ...(input.wordpressAdminPassword !== undefined
                ? {
                    wordpressAdminPassword:
                      input.wordpressAdminPassword || null,
                  }
                : {}),
              ...(input.directAdminUrl !== undefined
                ? { directAdminUrl: input.directAdminUrl || null }
                : {}),
              ...(input.directAdminUsername !== undefined
                ? { directAdminUsername: input.directAdminUsername || null }
                : {}),
              ...(input.directAdminPassword !== undefined
                ? { directAdminPassword: input.directAdminPassword || null }
                : {}),
            }
          : {}),
        ...(input.managementCoverage !== undefined
          ? { managementCoverage: input.managementCoverage }
          : {}),
      },
    });
  }
  async createAdmin(input: {
    tenantId: string;
    vpsNodeId?: string;
    domain: string;
    displayName?: string;
    planId?: string;
    activatePlan?: boolean;
    userId?: string;
    managementCoverage?: WebsiteManagementCoverage;
    wordpressAdminUrl?: string;
    wordpressAdminUsername?: string;
    wordpressAdminPassword?: string;
    directAdminUrl?: string;
    directAdminUsername?: string;
    directAdminPassword?: string;
    amount?: number;
    currency?: string;
    interval?: BillingInterval;
    periodStartsAt?: string;
    commercialModel?: BillingCommercialModel;
    commercialState?: BillingCommercialState;
    confirmUnauthorized?: boolean;
    actorId?: string;
  }) {
    if (input.activatePlan && !input.planId) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }
    if (
      input.activatePlan &&
      (input.amount === undefined || input.interval === undefined)
    ) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    if (input.activatePlan && input.actorId) {
      await this.commercialAuth.assertAuthorizedOrConfirmed({
        tenantId: input.tenantId,
        preferredUserId: input.userId,
        confirmUnauthorized: input.confirmUnauthorized,
        actorId: input.actorId,
        action: 'website.create.activate.unauthorized_override',
        entityType: 'Website',
        entityId: null,
      });
    }

    const managementCoverage =
      input.managementCoverage ?? WebsiteManagementCoverage.UNIXSEE_MANAGED;
    const isManaged =
      managementCoverage === WebsiteManagementCoverage.UNIXSEE_MANAGED;

    const website = await this.prisma.$transaction(async (tx) => {
      const activatedAt =
        input.planId && input.activatePlan
          ? input.periodStartsAt
            ? new Date(input.periodStartsAt)
            : new Date()
          : null;
      if (activatedAt && Number.isNaN(activatedAt.getTime())) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }

      const created = await tx.website.create({
        data: {
          tenantId: input.tenantId,
          vpsNodeId: input.vpsNodeId,
          managementCoverage,
          domain: input.domain,
          displayName: input.displayName,
          ...(isManaged
            ? {
                wordpressAdminUrl: input.wordpressAdminUrl || null,
                wordpressAdminUsername: input.wordpressAdminUsername || null,
                wordpressAdminPassword: input.wordpressAdminPassword || null,
                directAdminUrl: input.directAdminUrl || null,
                directAdminUsername: input.directAdminUsername || null,
                directAdminPassword: input.directAdminPassword || null,
              }
            : {}),
          planId: input.planId,
          planActivatedAt: activatedAt,
          userId: input.userId,
          isActive: true,
          status: WebsiteLifecycleStatus.ACTIVE,
        },
      });

      if (input.activatePlan && input.planId && activatedAt) {
        const plan = await tx.plan.findUnique({ where: { id: input.planId } });
        if (!plan) {
          throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
        }

        await this.billing.createManagedPlanItem(tx, {
          tenantId: input.tenantId,
          websiteId: created.id,
          planId: input.planId,
          labelSnapshot: plan.nameFa || plan.nameEn || plan.code,
          actorId: input.actorId,
          terms: {
            amount: input.amount!,
            currency: input.currency,
            interval: input.interval!,
            periodStartsAt: activatedAt,
            commercialModel: input.commercialModel,
            commercialState: input.commercialState,
          },
        });
      }

      return created;
    });

    this.logger.log('website.created', {
      websiteId: website.id,
      tenantId: website.tenantId,
      domain: website.domain,
    });

    return website;
  }

  async assign(
    websiteId: string,
    input: { tenantId: string; planId?: string },
  ) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
    });
    if (!website) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const updated = await this.prisma.website.update({
      where: { id: websiteId },
      data: {
        tenantId: input.tenantId,
        ...(input.planId ? { planId: input.planId } : {}),
        ...(input.planId ? { planActivatedAt: null } : {}),
        status: WebsiteLifecycleStatus.ACTIVE,
        isActive: true,
      },
    });

    this.logger.log('website.assigned', {
      websiteId,
      tenantId: input.tenantId,
      planId: input.planId ?? null,
    });

    return updated;
  }

  async transfer(
    websiteId: string,
    input: {
      tenantId: string;
      reason?: string;
      confirmUnauthorized?: boolean;
      actorId: string;
    },
  ) {
    if (!input.tenantId) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    await this.commercialAuth.assertAuthorizedOrConfirmed({
      tenantId: input.tenantId,
      confirmUnauthorized: input.confirmUnauthorized,
      actorId: input.actorId,
      action: 'website.transfer.unauthorized_override',
      entityType: 'Website',
      entityId: websiteId,
    });

    const updated = await this.prisma.website.update({
      where: { id: websiteId },
      data: { tenantId: input.tenantId },
    });

    this.logger.log('website.transferred', {
      websiteId,
      tenantId: input.tenantId,
      reason: input.reason ?? null,
    });

    return updated;
  }

  async retire(websiteId: string) {
    const updated = await this.prisma.website.update({
      where: { id: websiteId },
      data: {
        status: WebsiteLifecycleStatus.RETIRED,
        isActive: false,
      },
    });

    this.logger.log('website.retired', { websiteId });
    return updated;
  }

  private toCustomerVisitors24h(
    managementCoverage: WebsiteManagementCoverage,
    snapshot?: Visitors24hSnapshot,
  ) {
    if (
      managementCoverage !== WebsiteManagementCoverage.UNIXSEE_MANAGED ||
      !snapshot
    ) {
      return null;
    }

    const status = this.readAgentFieldStatus(snapshot.visitors24hStatus);
    const windowSeconds = snapshot.visitors24hWindowSeconds;
    const coverageSeconds = snapshot.visitors24hCoverageSeconds;
    const hasCompleteWindow =
      windowSeconds === 86_400 &&
      coverageSeconds !== null &&
      coverageSeconds >= windowSeconds;
    const isReady =
      status.state === 'ok' &&
      snapshot.uniqueVisitors24h !== null &&
      hasCompleteWindow;
    const isCollecting =
      status.reason === 'warming_up' ||
      (windowSeconds !== null &&
        coverageSeconds !== null &&
        coverageSeconds < windowSeconds);

    return {
      uniqueVisitors: isReady ? snapshot.uniqueVisitors24h : null,
      windowSeconds,
      coverageSeconds,
      measuredAt: snapshot.visitors24hMeasuredAt,
      status: isReady ? 'READY' : isCollecting ? 'COLLECTING' : 'UNAVAILABLE',
    } as const;
  }

  private readAgentFieldStatus(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { state: null, reason: null };
    }

    const state =
      'state' in value && typeof value.state === 'string' ? value.state : null;
    const reason =
      'reason' in value && typeof value.reason === 'string'
        ? value.reason
        : null;

    return { state, reason };
  }
}
