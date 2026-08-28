import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { IdempotencyService } from '#/common/idempotency/idempotency.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import { CommercialAuthorizationService } from '#/common/tenancy/commercial-authorization.service.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import { AuditService } from '#/modules/audit/services/audit.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

import {
  advanceByMonths,
  assertIntervalMatchesModel,
  billingItemInclude,
  BillingCommercialModel,
  BillingCommercialState,
  BillingInterval,
  BillingItemKind,
  BillingItemStatus,
  BillingPeriodReason,
  customerBillingStatusFilter,
  type BillingTx,
  type CommercialTermsInput,
  intervalMonths,
  resolvePeriodEnd,
} from '../billing.types.js';

@Injectable()
export class BillingService {
  private readonly logger = createAppLogger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly commercialAuth: CommercialAuthorizationService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async listByWebsiteAdmin(websiteId: string) {
    await this.requireWebsite(websiteId);
    const items = await this.prisma.billingItem.findMany({
      where: { websiteId },
      include: billingItemInclude,
      orderBy: [{ kind: 'asc' }, { createdAt: 'desc' }],
    });
    return { items };
  }

  async getAdmin(id: string) {
    const item = await this.prisma.billingItem.findUnique({
      where: { id },
      include: billingItemInclude,
    });
    if (!item) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return item;
  }

  async getWebsiteBillingForUser(userId: string, websiteId: string) {
    await this.tenantAccess.assertWebsiteAccess(userId, websiteId);
    const items = await this.prisma.billingItem.findMany({
      where: {
        websiteId,
        status: { in: [...customerBillingStatusFilter] },
      },
      include: billingItemInclude,
      orderBy: { createdAt: 'desc' },
    });

    const plan =
      items.find(
        (item) =>
          item.kind === BillingItemKind.MANAGED_PLAN &&
          item.status === BillingItemStatus.ACTIVE,
      ) ??
      items.find((item) => item.kind === BillingItemKind.MANAGED_PLAN) ??
      null;

    const complementaryServices = items.filter(
      (item) => item.kind === BillingItemKind.COMPLEMENTARY_SERVICE,
    );

    return { plan, complementaryServices };
  }

  /**
   * Tenant-scoped commercial hub for the customer dashboard.
   * Active-family statuses only (aligned with website billing read).
   */
  async listBillingForUser(
    userId: string,
    filters?: { kind?: BillingItemKind; websiteId?: string },
  ) {
    const tenantIds = await this.tenantAccess.getAccessibleTenantIds(userId);
    if (tenantIds.length === 0) {
      return { items: [] };
    }

    if (filters?.websiteId) {
      await this.tenantAccess.assertWebsiteAccess(userId, filters.websiteId);
    }

    const items = await this.prisma.billingItem.findMany({
      where: {
        tenantId: { in: tenantIds },
        status: { in: [...customerBillingStatusFilter] },
        ...(filters?.websiteId ? { websiteId: filters.websiteId } : {}),
        ...(filters?.kind ? { kind: filters.kind } : {}),
      },
      include: billingItemInclude,
      orderBy: [
        { renewsAt: 'asc' },
        { periodEndsAt: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return { items };
  }

  async createManagedPlanItem(
    tx: BillingTx,
    input: {
      tenantId: string;
      websiteId: string;
      planId: string;
      labelSnapshot: string;
      sourcePlanRequestId?: string | null;
      actorId?: string | null;
      periodReason?: BillingPeriodReason;
      terms: CommercialTermsInput;
    },
  ) {
    const commercialModel =
      input.terms.commercialModel ?? BillingCommercialModel.RECURRING_RETAINER;
    this.validateTerms(commercialModel, input.terms);

    const existingActive = await tx.billingItem.findFirst({
      where: {
        websiteId: input.websiteId,
        kind: BillingItemKind.MANAGED_PLAN,
        status: BillingItemStatus.ACTIVE,
      },
    });
    if (existingActive) {
      throw new ConflictException(ERROR_MESSAGES.fa.conflict);
    }

    const periodStartsAt = this.parseDate(
      input.terms.periodStartsAt,
      new Date(),
    );
    const periodEndsAt = resolvePeriodEnd(periodStartsAt, input.terms.interval);
    const currency = input.terms.currency?.trim() || 'IRR';
    const commercialState =
      input.terms.commercialState ?? BillingCommercialState.AGREED;
    const periodReason = input.periodReason ?? BillingPeriodReason.ACTIVATION;

    const item = await tx.billingItem.create({
      data: {
        tenantId: input.tenantId,
        websiteId: input.websiteId,
        kind: BillingItemKind.MANAGED_PLAN,
        planId: input.planId,
        sourcePlanRequestId: input.sourcePlanRequestId ?? null,
        labelSnapshot: input.labelSnapshot,
        commercialModel,
        amount: input.terms.amount,
        currency,
        interval: input.terms.interval,
        status: BillingItemStatus.ACTIVE,
        commercialState,
        periodStartsAt,
        periodEndsAt,
        renewsAt: periodEndsAt,
        periods: {
          create: {
            startsAt: periodStartsAt,
            endsAt: periodEndsAt ?? periodStartsAt,
            amount: input.terms.amount,
            currency,
            interval: input.terms.interval,
            reason: periodReason,
            createdById: input.actorId ?? null,
          },
        },
      },
      include: billingItemInclude,
    });

    this.logger.log('billing.managed_plan.created', {
      billingItemId: item.id,
      websiteId: input.websiteId,
      planId: input.planId,
    });

    return item;
  }

  async createComplementaryItem(
    tx: BillingTx,
    input: {
      tenantId: string;
      websiteId: string;
      serviceAssignmentId: string;
      sourceQuotationId?: string | null;
      labelSnapshot: string;
      actorId?: string | null;
      terms: CommercialTermsInput;
    },
  ) {
    const commercialModel =
      input.terms.commercialModel ?? BillingCommercialModel.CUSTOM_QUOTE;
    this.validateTerms(commercialModel, input.terms);

    const existing = await tx.billingItem.findUnique({
      where: { serviceAssignmentId: input.serviceAssignmentId },
    });
    if (existing) {
      return tx.billingItem.findUniqueOrThrow({
        where: { id: existing.id },
        include: billingItemInclude,
      });
    }

    const periodStartsAt = this.parseDate(
      input.terms.periodStartsAt,
      new Date(),
    );
    const periodEndsAt = resolvePeriodEnd(periodStartsAt, input.terms.interval);
    const currency = input.terms.currency?.trim() || 'IRR';
    const commercialState =
      input.terms.commercialState ?? BillingCommercialState.AGREED;

    const item = await tx.billingItem.create({
      data: {
        tenantId: input.tenantId,
        websiteId: input.websiteId,
        kind: BillingItemKind.COMPLEMENTARY_SERVICE,
        serviceAssignmentId: input.serviceAssignmentId,
        sourceQuotationId: input.sourceQuotationId ?? null,
        labelSnapshot: input.labelSnapshot,
        commercialModel,
        amount: input.terms.amount,
        currency,
        interval: input.terms.interval,
        status: BillingItemStatus.ACTIVE,
        commercialState,
        periodStartsAt,
        periodEndsAt,
        renewsAt: periodEndsAt,
        periods: {
          create: {
            startsAt: periodStartsAt,
            endsAt: periodEndsAt ?? periodStartsAt,
            amount: input.terms.amount,
            currency,
            interval: input.terms.interval,
            reason: BillingPeriodReason.ACTIVATION,
            createdById: input.actorId ?? null,
          },
        },
      },
      include: billingItemInclude,
    });

    this.logger.log('billing.complementary.created', {
      billingItemId: item.id,
      websiteId: input.websiteId,
      serviceAssignmentId: input.serviceAssignmentId,
    });

    return item;
  }

  async recordPlanTerms(
    websiteId: string,
    actorId: string,
    input: CommercialTermsInput & {
      planId?: string;
      confirmUnauthorized?: boolean;
    },
  ) {
    const website = await this.requireWebsite(websiteId);
    if (!website.planId || !website.planActivatedAt) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    await this.commercialAuth.assertAuthorizedOrConfirmed({
      tenantId: website.tenantId,
      preferredUserId: website.userId,
      confirmUnauthorized: input.confirmUnauthorized,
      actorId,
      action: 'billing.record_plan_terms.unauthorized_override',
      entityType: 'Website',
      entityId: websiteId,
    });

    const planId = input.planId ?? website.planId;
    if (planId !== website.planId) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const item = await this.prisma.$transaction(async (tx) => {
      return this.createManagedPlanItem(tx, {
        tenantId: website.tenantId,
        websiteId,
        planId,
        labelSnapshot: plan.nameFa || plan.nameEn || plan.code,
        actorId,
        terms: {
          ...input,
          periodStartsAt:
            input.periodStartsAt ?? website.planActivatedAt ?? new Date(),
        },
      });
    });

    await this.audit.record({
      actorId,
      action: 'billing.record_plan_terms',
      entityType: 'BillingItem',
      entityId: item.id,
      metadata: { websiteId, planId },
    });

    return item;
  }

  async renew(
    id: string,
    actorId: string,
    input?: { amount?: number; confirmUnauthorized?: boolean },
    idempotencyKey?: string,
  ) {
    const execute = async () => {
      const item = await this.getAdmin(id);
      if (item.status !== BillingItemStatus.ACTIVE) {
        throw new ConflictException(ERROR_MESSAGES.fa.conflict);
      }
      if (item.interval === BillingInterval.NONE) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }

      await this.commercialAuth.assertAuthorizedOrConfirmed({
        tenantId: item.tenantId,
        confirmUnauthorized: input?.confirmUnauthorized,
        actorId,
        action: 'billing.renew.unauthorized_override',
        entityType: 'BillingItem',
        entityId: id,
      });

      const months = intervalMonths(item.interval);
      if (months === null) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }

      const closingEndsAt =
        item.renewsAt ??
        item.periodEndsAt ??
        resolvePeriodEnd(item.periodStartsAt, item.interval);
      if (!closingEndsAt) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }

      const nextAmount = input?.amount ?? Number(item.amount);
      const nextStartsAt = closingEndsAt;
      const nextEndsAt = advanceByMonths(nextStartsAt, months);

      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.billingPeriodRow.create({
          data: {
            billingItemId: item.id,
            startsAt: nextStartsAt,
            endsAt: nextEndsAt,
            amount: nextAmount,
            currency: item.currency,
            interval: item.interval,
            reason: BillingPeriodReason.RENEWAL,
            createdById: actorId,
          },
        });

        return tx.billingItem.update({
          where: { id: item.id },
          data: {
            amount: nextAmount,
            periodStartsAt: nextStartsAt,
            periodEndsAt: nextEndsAt,
            renewsAt: nextEndsAt,
          },
          include: billingItemInclude,
        });
      });

      await this.audit.record({
        actorId,
        action: 'billing.renew',
        entityType: 'BillingItem',
        entityId: id,
        metadata: {
          previousEndsAt: closingEndsAt.toISOString(),
          nextEndsAt: nextEndsAt.toISOString(),
          amount: nextAmount,
        },
      });

      this.logger.log('billing.renewed', { billingItemId: id, actorId });
      return updated;
    };

    if (idempotencyKey) {
      return this.idempotency.beginOrReplay({
        key: idempotencyKey,
        scope: `billing.renew:${id}`,
        actorId,
        execute,
      });
    }

    return execute();
  }

  async replacePlan(
    websiteId: string,
    actorId: string,
    input: CommercialTermsInput & {
      planId: string;
      confirmUnauthorized?: boolean;
    },
    idempotencyKey?: string,
  ) {
    const execute = async () => {
      const website = await this.requireWebsite(websiteId);

      await this.commercialAuth.assertAuthorizedOrConfirmed({
        tenantId: website.tenantId,
        preferredUserId: website.userId,
        confirmUnauthorized: input.confirmUnauthorized,
        actorId,
        action: 'billing.replace_plan.unauthorized_override',
        entityType: 'Website',
        entityId: websiteId,
      });

      const plan = await this.prisma.plan.findUnique({
        where: { id: input.planId },
      });
      if (!plan) {
        throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
      }

      const activatedAt = new Date();
      const result = await this.prisma.$transaction(async (tx) => {
        const active = await tx.billingItem.findFirst({
          where: {
            websiteId,
            kind: BillingItemKind.MANAGED_PLAN,
            status: BillingItemStatus.ACTIVE,
          },
        });

        if (active) {
          const endsAt = active.renewsAt ?? active.periodEndsAt ?? activatedAt;
          await tx.billingPeriodRow.create({
            data: {
              billingItemId: active.id,
              startsAt: active.periodStartsAt,
              endsAt,
              amount: active.amount,
              currency: active.currency,
              interval: active.interval,
              reason: BillingPeriodReason.PLAN_REPLACEMENT,
              createdById: actorId,
            },
          });
          await tx.billingItem.update({
            where: { id: active.id },
            data: {
              status: BillingItemStatus.CANCELLED,
              cancelledAt: activatedAt,
              cancellationReason: 'Replaced by new managed plan',
              periodEndsAt: endsAt,
              renewsAt: null,
            },
          });
        }

        await tx.website.update({
          where: { id: websiteId },
          data: {
            planId: input.planId,
            planActivatedAt: activatedAt,
          },
        });

        const item = await this.createManagedPlanItem(tx, {
          tenantId: website.tenantId,
          websiteId,
          planId: input.planId,
          labelSnapshot: plan.nameFa || plan.nameEn || plan.code,
          actorId,
          periodReason: BillingPeriodReason.PLAN_REPLACEMENT,
          terms: {
            ...input,
            periodStartsAt: input.periodStartsAt ?? activatedAt,
          },
        });

        return item;
      });

      await this.audit.record({
        actorId,
        action: 'billing.replace_plan',
        entityType: 'BillingItem',
        entityId: result.id,
        metadata: { websiteId, planId: input.planId },
      });

      return result;
    };

    if (idempotencyKey) {
      return this.idempotency.beginOrReplay({
        key: idempotencyKey,
        scope: `billing.replace_plan:${websiteId}`,
        actorId,
        execute,
      });
    }

    return execute();
  }

  async cancel(
    id: string,
    actorId: string,
    input: { reason: string; effectAt?: string },
  ) {
    return this.transitionLifecycle(id, actorId, {
      status: BillingItemStatus.CANCELLED,
      reason: input.reason,
      effectAt: input.effectAt,
      action: 'billing.cancel',
      setCancelled: true,
    });
  }

  async complete(
    id: string,
    actorId: string,
    input: { reason?: string; effectAt?: string },
  ) {
    return this.transitionLifecycle(id, actorId, {
      status: BillingItemStatus.COMPLETED,
      reason: input.reason ?? 'Completed',
      effectAt: input.effectAt,
      action: 'billing.complete',
      setCancelled: false,
    });
  }

  async pause(
    id: string,
    actorId: string,
    input: { reason: string; effectAt?: string },
  ) {
    return this.transitionLifecycle(id, actorId, {
      status: BillingItemStatus.PAUSED,
      reason: input.reason,
      effectAt: input.effectAt,
      action: 'billing.pause',
      setCancelled: false,
    });
  }

  async expireOverdue(now = new Date()): Promise<number> {
    const result = await this.prisma.billingItem.updateMany({
      where: {
        status: BillingItemStatus.ACTIVE,
        interval: { not: BillingInterval.NONE },
        OR: [{ renewsAt: { lt: now } }, { periodEndsAt: { lt: now } }],
      },
      data: { status: BillingItemStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log('billing.expired_batch', {
        count: result.count,
        at: now.toISOString(),
      });
    }

    return result.count;
  }

  private async transitionLifecycle(
    id: string,
    actorId: string,
    input: {
      status: BillingItemStatus;
      reason: string;
      effectAt?: string;
      action: string;
      setCancelled: boolean;
    },
  ) {
    const item = await this.getAdmin(id);
    if (
      item.status === BillingItemStatus.CANCELLED ||
      item.status === BillingItemStatus.COMPLETED
    ) {
      throw new ConflictException(ERROR_MESSAGES.fa.conflict);
    }

    const effectAt = this.parseDate(input.effectAt, new Date());
    const updated = await this.prisma.billingItem.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.setCancelled
          ? {
              cancelledAt: effectAt,
              cancellationReason: input.reason,
            }
          : {
              nonRenewalReason: input.reason,
            }),
        ...(input.status === BillingItemStatus.COMPLETED ||
        input.status === BillingItemStatus.CANCELLED
          ? { periodEndsAt: effectAt, renewsAt: null }
          : {}),
      },
      include: billingItemInclude,
    });

    await this.audit.record({
      actorId,
      action: input.action,
      entityType: 'BillingItem',
      entityId: id,
      metadata: { reason: input.reason, effectAt: effectAt.toISOString() },
    });

    return updated;
  }

  private validateTerms(
    commercialModel: BillingCommercialModel,
    terms: CommercialTermsInput,
  ) {
    if (
      typeof terms.amount !== 'number' ||
      Number.isNaN(terms.amount) ||
      terms.amount < 0
    ) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }
    if (!assertIntervalMatchesModel(commercialModel, terms.interval)) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }
  }

  private parseDate(value: string | Date | undefined | null, fallback: Date) {
    if (!value) {
      return fallback;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }
    return date;
  }

  private async requireWebsite(websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
    });
    if (!website) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return website;
  }
}
