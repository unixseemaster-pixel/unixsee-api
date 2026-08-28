import type { Prisma } from '#/generated/prisma/client.js';
import {
  BillingCommercialModel,
  BillingCommercialState,
  BillingInterval,
  BillingItemKind,
  BillingItemStatus,
  BillingPeriodReason,
} from '#/generated/prisma/enums.js';

export type BillingTx = Prisma.TransactionClient;

export type CommercialTermsInput = {
  amount: number;
  currency?: string;
  interval: BillingInterval;
  periodStartsAt?: string | Date;
  commercialModel?: BillingCommercialModel;
  commercialState?: BillingCommercialState;
};

export function intervalMonths(interval: BillingInterval): number | null {
  switch (interval) {
    case BillingInterval.MONTHLY:
      return 1;
    case BillingInterval.QUARTERLY:
      return 3;
    case BillingInterval.YEARLY:
      return 12;
    case BillingInterval.NONE:
      return null;
  }
}

export function advanceByMonths(from: Date, months: number): Date {
  const next = new Date(from.getTime());
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function resolvePeriodEnd(
  startsAt: Date,
  interval: BillingInterval,
): Date | null {
  const months = intervalMonths(interval);
  if (months === null) {
    return null;
  }
  return advanceByMonths(startsAt, months);
}

export function assertIntervalMatchesModel(
  commercialModel: BillingCommercialModel,
  interval: BillingInterval,
): boolean {
  const oneShot =
    commercialModel === BillingCommercialModel.FIXED_SCOPE ||
    commercialModel === BillingCommercialModel.MILESTONE_PROJECT;

  if (oneShot) {
    return interval === BillingInterval.NONE;
  }

  return interval !== BillingInterval.NONE;
}

export const billingItemInclude = {
  periods: { orderBy: { startsAt: 'desc' as const } },
  plan: { select: { id: true, code: true, nameFa: true, nameEn: true } },
  serviceAssignment: {
    select: {
      id: true,
      requestId: true,
      startedAt: true,
      completedAt: true,
    },
  },
  website: {
    select: { id: true, domain: true, displayName: true },
  },
} satisfies Prisma.BillingItemInclude;

/** Customer hub list: same relations as billing items, active-family statuses. */
export const customerBillingStatusFilter = [
  BillingItemStatus.ACTIVE,
  BillingItemStatus.SCHEDULED,
  BillingItemStatus.PAUSED,
  BillingItemStatus.EXPIRED,
] as const;

export type BillingItemWithRelations = Prisma.BillingItemGetPayload<{
  include: typeof billingItemInclude;
}>;

export {
  BillingCommercialModel,
  BillingCommercialState,
  BillingInterval,
  BillingItemKind,
  BillingItemStatus,
  BillingPeriodReason,
};
