import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { IdempotencyService } from '#/common/idempotency/idempotency.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import { PlanRequestStatus } from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { UsersService } from '#/modules/users/services/users.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import {
  normalizeContactEmail,
  normalizeContactPhoneToE164,
  normalizeWebsiteDomain,
} from '#/utils/helpers.js';

export type PublicAccountMatchBy = 'phone' | 'email' | 'website';

@Injectable()
export class PlanRequestsService {
  private readonly logger = createAppLogger(PlanRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly idempotency: IdempotencyService,
    private readonly usersService: UsersService,
  ) {}

  async createPublic(input: {
    planId: string;
    contactName: string;
    contactPhone?: string;
    contactEmail?: string;
    websiteDomain?: string;
    notes?: string;
  }) {
    await this.requirePublishedPlan(input.planId);
    await this.assertNoExistingCustomerAccount(input);

    const request = await this.prisma.planRequest.create({
      data: {
        planId: input.planId,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        websiteDomain: input.websiteDomain,
        notes: input.notes,
        status: PlanRequestStatus.SUBMITTED,
      },
      include: { plan: true },
    });

    this.logger.log('plan_request.created', {
      planRequestId: request.id,
      planId: request.planId,
    });
    return request;
  }

  async createForUser(
    userId: string,
    input: {
      planId: string;
      contactName: string;
      contactPhone?: string;
      contactEmail?: string;
      websiteDomain?: string;
      notes?: string;
    },
  ) {
    await this.requirePublishedPlan(input.planId);

    const tenantIds = await this.tenantAccess.getAccessibleTenantIds(userId);
    const tenantId = tenantIds[0] ?? null;

    const request = await this.prisma.planRequest.create({
      data: {
        planId: input.planId,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        websiteDomain: input.websiteDomain,
        notes: input.notes,
        createdByUserId: userId,
        linkedUserId: userId,
        ...(tenantId ? { tenantId } : {}),
        status: PlanRequestStatus.SUBMITTED,
      },
      include: { plan: true },
    });

    this.logger.log('plan_request.created_for_user', {
      planRequestId: request.id,
      planId: request.planId,
      userId,
      tenantId,
    });
    return request;
  }

  async checkPublicAccount(input: {
    contactPhone?: string;
    contactEmail?: string;
    websiteDomain?: string;
  }): Promise<{ exists: boolean; matchedBy: PublicAccountMatchBy | null }> {
    const phoneNumber = input.contactPhone
      ? normalizeContactPhoneToE164(input.contactPhone)
      : null;
    const email = normalizeContactEmail(input.contactEmail);
    const domain = normalizeWebsiteDomain(input.websiteDomain);

    if (phoneNumber) {
      const byPhone = await this.usersService.findCustomerByPhoneOrEmail({
        phoneNumber,
      });
      if (byPhone) {
        return { exists: true, matchedBy: 'phone' };
      }
    }

    if (email) {
      const byEmail = await this.usersService.findCustomerByPhoneOrEmail({
        email,
      });
      if (byEmail) {
        return { exists: true, matchedBy: 'email' };
      }
    }

    if (domain) {
      const website = await this.usersService.findCustomerOwningWebsiteDomain(
        domain,
      );
      if (website) {
        return { exists: true, matchedBy: 'website' };
      }
    }

    return { exists: false, matchedBy: null };
  }

  private async requirePublishedPlan(planId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, isPublished: true },
    });
    if (!plan) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return plan;
  }

  private async assertNoExistingCustomerAccount(input: {
    contactPhone?: string;
    contactEmail?: string;
    websiteDomain?: string;
  }) {
    const match = await this.checkPublicAccount(input);
    if (match.exists) {
      this.logger.warn('plan_request.public.rejected_account_exists', {
        matchedBy: match.matchedBy,
      });
      throw new ConflictException({
        code: 'ACCOUNT_EXISTS',
        message: ERROR_MESSAGES.en.conflict,
      });
    }
  }

  async listForUser(userId: string, params?: { skip?: number; take?: number }) {
    const tenantIds = await this.tenantAccess.getAccessibleTenantIds(userId);
    const where = { tenantId: { in: tenantIds } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.planRequest.findMany({
        where,
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.planRequest.count({ where }),
    ]);

    return { items, total };
  }

  async getForUser(userId: string, id: string) {
    const request = await this.prisma.planRequest.findUnique({
      where: { id },
      include: { plan: true, website: true },
    });
    if (!request?.tenantId) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    await this.tenantAccess.requireMembership(userId, request.tenantId);
    return request;
  }

  async listAdmin(params?: {
    status?: PlanRequestStatus;
    skip?: number;
    take?: number;
  }) {
    const where = params?.status ? { status: params.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.planRequest.findMany({
        where,
        include: {
          plan: true,
          tenant: true,
          website: true,
          linkedUser: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.planRequest.count({ where }),
    ]);
    return { items, total };
  }

  async getAdmin(id: string) {
    const request = await this.prisma.planRequest.findUnique({
      where: { id },
      include: { plan: true, tenant: true, website: true, linkedUser: true },
    });
    if (!request) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return request;
  }

  async link(
    id: string,
    input: { tenantId: string; linkedUserId?: string; websiteId?: string },
  ) {
    const request = await this.getAdmin(id);
    if (
      request.status === PlanRequestStatus.ENABLED ||
      request.status === PlanRequestStatus.DECLINED
    ) {
      throw new ConflictException(ERROR_MESSAGES.fa.conflict);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (input.websiteId) {
      const website = await this.prisma.website.findUnique({
        where: { id: input.websiteId },
      });
      if (!website || website.tenantId !== input.tenantId) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }
    }

    const updated = await this.prisma.planRequest.update({
      where: { id },
      data: {
        tenantId: input.tenantId,
        linkedUserId: input.linkedUserId,
        websiteId: input.websiteId,
        status: PlanRequestStatus.LINKED,
      },
      include: {
        plan: true,
        tenant: true,
        website: true,
        linkedUser: true,
      },
    });

    this.logger.log('plan_request.linked', {
      planRequestId: id,
      tenantId: input.tenantId,
    });
    return updated;
  }

  async enable(
    id: string,
    actorId: string,
    input: { websiteId: string; tenantId?: string },
    idempotencyKey?: string,
  ) {
    const execute = async () => {
      const request = await this.getAdmin(id);
      if (request.status === PlanRequestStatus.ENABLED) {
        return request;
      }
      if (request.status === PlanRequestStatus.DECLINED) {
        throw new ConflictException(ERROR_MESSAGES.fa.conflict);
      }

      const website = await this.prisma.website.findUnique({
        where: { id: input.websiteId },
      });
      if (!website) {
        throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
      }

      const tenantId = input.tenantId ?? request.tenantId ?? website.tenantId;
      if (!tenantId || website.tenantId !== tenantId) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }

      if (website.planId && website.planId !== request.planId) {
        throw new ConflictException(ERROR_MESSAGES.fa.conflict);
      }

      const enabled = await this.prisma.$transaction(async (tx) => {
        await tx.website.update({
          where: { id: website.id },
          data: { planId: request.planId },
        });

        return tx.planRequest.update({
          where: { id },
          data: {
            status: PlanRequestStatus.ENABLED,
            tenantId,
            websiteId: website.id,
            enabledAt: new Date(),
            ...(idempotencyKey ? { idempotencyKey } : {}),
          },
          include: { plan: true, tenant: true, website: true, linkedUser: true },
        });
      });

      this.logger.log('plan_request.enabled', {
        planRequestId: id,
        websiteId: website.id,
        planId: request.planId,
        actorId,
      });
      return enabled;
    };

    if (idempotencyKey) {
      return this.idempotency.beginOrReplay({
        key: idempotencyKey,
        scope: `plan-request.enable:${id}`,
        actorId,
        execute,
      });
    }

    return execute();
  }

  async decline(id: string, reason?: string) {
    const request = await this.getAdmin(id);
    if (
      request.status === PlanRequestStatus.ENABLED ||
      request.status === PlanRequestStatus.DECLINED
    ) {
      throw new ConflictException(ERROR_MESSAGES.fa.conflict);
    }

    const updated = await this.prisma.planRequest.update({
      where: { id },
      data: {
        status: PlanRequestStatus.DECLINED,
        declinedAt: new Date(),
        declineReason: reason ?? null,
      },
      include: {
        plan: true,
        tenant: true,
        website: true,
        linkedUser: true,
      },
    });

    this.logger.log('plan_request.declined', { planRequestId: id });
    return updated;
  }
}
