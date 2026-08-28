import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { IdempotencyService } from '#/common/idempotency/idempotency.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import { CommercialAuthorizationService } from '#/common/tenancy/commercial-authorization.service.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import type { Prisma } from '#/generated/prisma/client.js';
import {
  ComplementaryAuthorizationState,
  ComplementaryEngagementPreference,
  ComplementaryRequestStatus,
  ComplementaryWebsiteResolutionState,
  ComplementaryWebsiteTargetType,
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
import { normalizeWebsiteDomain } from '#/utils/helpers.js';

type CreateAuthenticatedRequestInput = {
  catalogItemId: string;
  websiteId?: string;
  websiteDomain?: string;
  engagementPreference: ComplementaryEngagementPreference;
  title: string;
  description: string;
  scope?: Record<string, unknown>;
};

@Injectable()
export class ComplementaryServicesService {
  private readonly logger = createAppLogger(ComplementaryServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly commercialAuth: CommercialAuthorizationService,
    private readonly idempotency: IdempotencyService,
    private readonly billing: BillingService,
  ) {}

  async listPublishedCatalog() {
    return this.prisma.serviceCatalogItem.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createPublicRequest(input: {
    catalogItemId: string;
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    details?: string;
  }) {
    const item = await this.prisma.serviceCatalogItem.findFirst({
      where: { id: input.catalogItemId, isPublished: true },
    });
    if (!item) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const request = await this.prisma.complementaryServiceRequest.create({
      data: {
        catalogItemId: input.catalogItemId,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        details: input.details,
        status: ComplementaryRequestStatus.SUBMITTED,
      },
      include: { catalogItem: true },
    });

    this.logger.log('complementary_request.created', {
      requestId: request.id,
      catalogItemId: request.catalogItemId,
    });
    return request;
  }

  async createForUser(
    user: CurrentUserType,
    input: CreateAuthenticatedRequestInput,
    idempotencyKey?: string,
  ) {
    const execute = () => this.createForUserOnce(user, input);
    if (!idempotencyKey) return execute();

    return this.idempotency.beginOrReplay({
      key: idempotencyKey,
      scope: 'complementary-request.create:' + user.id,
      actorId: user.id,
      execute,
    });
  }

  private async createForUserOnce(
    user: CurrentUserType,
    input: CreateAuthenticatedRequestInput,
  ) {
    const hasWebsiteId = Boolean(input.websiteId);
    const hasWebsiteDomain = Boolean(input.websiteDomain?.trim());
    if (hasWebsiteId === hasWebsiteDomain) {
      throw new BadRequestException({
        code: 'WEBSITE_TARGET_REQUIRED',
        message: ERROR_MESSAGES.en.validation,
      });
    }

    const contactName = user.fullName?.trim();
    if (!contactName || (!user.phoneNumber && !user.email)) {
      throw new BadRequestException({
        code: 'PROFILE_INCOMPLETE',
        message: ERROR_MESSAGES.en.validation,
      });
    }

    const item = await this.prisma.serviceCatalogItem.findFirst({
      where: { id: input.catalogItemId, isPublished: true },
    });
    if (!item) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const writableRoles: MembershipRole[] = [
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
    ];
    const memberships = await this.tenantAccess.getMembershipsForUser(user.id);
    const writableMemberships = memberships.filter((membership) =>
      writableRoles.includes(membership.role),
    );

    let tenantId: string | null = null;
    let websiteId: string | null = null;
    let websiteDomain: string;
    let targetType: ComplementaryWebsiteTargetType;
    let coverage: WebsiteManagementCoverage;
    let resolution: ComplementaryWebsiteResolutionState;
    let authorizationState: ComplementaryAuthorizationState;

    if (input.websiteId) {
      const website = await this.prisma.website.findUnique({
        where: { id: input.websiteId },
      });
      if (!website) {
        throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
      }
      await this.tenantAccess.requireMembership(
        user.id,
        website.tenantId,
        writableRoles,
      );
      tenantId = website.tenantId;
      websiteId = website.id;
      websiteDomain = website.domain;
      targetType = ComplementaryWebsiteTargetType.EXISTING_WEBSITE;
      coverage = website.managementCoverage;
      resolution = ComplementaryWebsiteResolutionState.LINKED;
      authorizationState = user.authorized
        ? ComplementaryAuthorizationState.AUTHORIZED
        : ComplementaryAuthorizationState.NOT_AUTHORIZED;
    } else {
      websiteDomain = this.requireExternalDomain(input.websiteDomain);
      if (memberships.length > 0 && writableMemberships.length === 0) {
        throw new ForbiddenException(ERROR_MESSAGES.fa.forbidden);
      }

      const existing = await this.prisma.website.findUnique({
        where: { domain: websiteDomain },
      });
      const matchingMembership = existing
        ? writableMemberships.find(
            (membership) => membership.tenantId === existing.tenantId,
          )
        : undefined;

      if (existing && !matchingMembership) {
        throw new ConflictException(ERROR_MESSAGES.fa.conflict);
      }

      if (existing && matchingMembership) {
        tenantId = existing.tenantId;
        websiteId = existing.id;
        targetType = ComplementaryWebsiteTargetType.EXISTING_WEBSITE;
        coverage = existing.managementCoverage;
        resolution = ComplementaryWebsiteResolutionState.LINKED;
        authorizationState = user.authorized
          ? ComplementaryAuthorizationState.AUTHORIZED
          : ComplementaryAuthorizationState.NOT_AUTHORIZED;
      } else {
        tenantId = writableMemberships[0]?.tenantId ?? null;
        targetType = ComplementaryWebsiteTargetType.TYPED_DOMAIN;
        coverage = WebsiteManagementCoverage.EXTERNAL_INFRASTRUCTURE;
        resolution = ComplementaryWebsiteResolutionState.PENDING_ACCEPTANCE;
        authorizationState =
          tenantId && user.authorized
            ? ComplementaryAuthorizationState.AUTHORIZED
            : ComplementaryAuthorizationState.NOT_AUTHORIZED;
      }
    }

    const request = await this.prisma.complementaryServiceRequest.create({
      data: {
        catalogItemId: input.catalogItemId,
        status: ComplementaryRequestStatus.SUBMITTED,
        contactName,
        contactPhone: user.phoneNumber,
        contactEmail: user.email,
        details: input.description.trim(),
        title: input.title.trim(),
        engagementPreference: input.engagementPreference,
        scope: input.scope as Prisma.InputJsonValue | undefined,
        tenantId,
        websiteId,
        websiteDomain,
        websiteTargetType: targetType,
        websiteCoverageSnapshot: coverage,
        websiteResolutionState: resolution,
        authorizationState,
        createdByUserId: user.id,
      },
      include: { catalogItem: true, website: true },
    });

    this.logger.log('complementary_request.created_for_user', {
      requestId: request.id,
      userId: user.id,
      tenantId,
      websiteId,
      websiteDomain,
    });
    return request;
  }
  async listForUser(userId: string, params?: { skip?: number; take?: number }) {
    const tenantIds = await this.tenantAccess.getAccessibleTenantIds(userId);
    const where = {
      OR: [{ createdByUserId: userId }, { tenantId: { in: tenantIds } }],
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.complementaryServiceRequest.findMany({
        where,
        include: {
          catalogItem: true,
          quotations: true,
          website: true,
          assignments: { include: { usageRecords: true, deliverables: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.complementaryServiceRequest.count({ where }),
    ]);
    return { items, total };
  }

  async getForUser(userId: string, id: string) {
    const request = await this.prisma.complementaryServiceRequest.findUnique({
      where: { id },
      include: { catalogItem: true, quotations: true, assignments: true },
    });
    if (!request) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    if (request.createdByUserId === userId) {
      return request;
    }
    if (!request.tenantId) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    await this.tenantAccess.requireMembership(userId, request.tenantId);
    return request;
  }

  async withdraw(userId: string, id: string) {
    const request = await this.getForUser(userId, id);
    if (
      request.status !== ComplementaryRequestStatus.SUBMITTED &&
      request.status !== ComplementaryRequestStatus.QUOTED
    ) {
      throw new ConflictException(ERROR_MESSAGES.fa.conflict);
    }

    const updated = await this.prisma.complementaryServiceRequest.update({
      where: { id },
      data: {
        status: ComplementaryRequestStatus.WITHDRAWN,
        withdrawnAt: new Date(),
      },
      include: { catalogItem: true },
    });

    this.logger.log('complementary_request.withdrawn', {
      requestId: id,
      userId,
    });
    return updated;
  }

  async listAdmin(params?: {
    status?: ComplementaryRequestStatus;
    skip?: number;
    take?: number;
  }) {
    const where = params?.status ? { status: params.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.complementaryServiceRequest.findMany({
        where,
        include: {
          catalogItem: true,
          tenant: true,
          quotations: true,
          assignments: true,
          website: true,
          createdByUser: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.complementaryServiceRequest.count({ where }),
    ]);
    return { items, total };
  }

  async getAdmin(id: string) {
    const request = await this.prisma.complementaryServiceRequest.findUnique({
      where: { id },
      include: {
        catalogItem: true,
        tenant: true,
        quotations: true,
        assignments: { include: { usageRecords: true, deliverables: true } },
        website: true,
        createdByUser: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
    });
    if (!request) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return request;
  }

  async patchRequest(
    id: string,
    data: {
      status?: ComplementaryRequestStatus;
      tenantId?: string | null;
      websiteId?: string | null;
      details?: string | null;
    },
  ) {
    await this.getAdmin(id);
    const updated = await this.prisma.complementaryServiceRequest.update({
      where: { id },
      data,
      include: { catalogItem: true, quotations: true },
    });
    this.logger.log('complementary_request.updated', { requestId: id });
    return updated;
  }

  async acceptRequest(
    requestId: string,
    actorId: string,
    idempotencyKey?: string,
  ) {
    const execute = async () => {
      const request = await this.getAdmin(requestId);
      if (
        request.status === ComplementaryRequestStatus.ACCEPTED ||
        request.status === ComplementaryRequestStatus.ASSIGNED ||
        request.status === ComplementaryRequestStatus.IN_PROGRESS ||
        request.status === ComplementaryRequestStatus.COMPLETED
      ) {
        return request;
      }
      if (
        request.status === ComplementaryRequestStatus.WITHDRAWN ||
        request.status === ComplementaryRequestStatus.CANCELLED
      ) {
        throw new ConflictException(ERROR_MESSAGES.fa.conflict);
      }

      const accepted = await this.prisma.$transaction(async (tx) => {
        let websiteId = request.websiteId;
        let coverage = request.websiteCoverageSnapshot;
        let resolution = request.websiteResolutionState;
        let authorizationState = request.authorizationState;

        if (websiteId) {
          const website = await tx.website.findUnique({
            where: { id: websiteId },
          });
          if (
            !website ||
            (request.tenantId && website.tenantId !== request.tenantId)
          ) {
            throw new ConflictException(ERROR_MESSAGES.fa.conflict);
          }
          coverage = website.managementCoverage;
          resolution = ComplementaryWebsiteResolutionState.LINKED;
          authorizationState = ComplementaryAuthorizationState.AUTHORIZED;
        } else if (
          request.websiteTargetType ===
          ComplementaryWebsiteTargetType.TYPED_DOMAIN
        ) {
          const domain = this.requireExternalDomain(request.websiteDomain);
          if (request.tenantId) {
            const existing = await tx.website.findUnique({
              where: { domain },
            });
            if (existing && existing.tenantId !== request.tenantId) {
              throw new ConflictException(ERROR_MESSAGES.fa.conflict);
            }
            const website =
              existing ??
              (await tx.website.create({
                data: {
                  tenantId: request.tenantId,
                  userId: request.createdByUserId,
                  domain,
                  displayName: domain,
                  managementCoverage:
                    WebsiteManagementCoverage.EXTERNAL_INFRASTRUCTURE,
                  status: WebsiteLifecycleStatus.ACTIVE,
                  isActive: true,
                },
              }));
            websiteId = website.id;
            coverage = website.managementCoverage;
            resolution = ComplementaryWebsiteResolutionState.LINKED;
            authorizationState = ComplementaryAuthorizationState.AUTHORIZED;
          } else {
            resolution = ComplementaryWebsiteResolutionState.DEFERRED_NO_TENANT;
            authorizationState = ComplementaryAuthorizationState.NOT_AUTHORIZED;
          }
        }

        const updated = await tx.complementaryServiceRequest.update({
          where: { id: requestId },
          data: {
            status: ComplementaryRequestStatus.ACCEPTED,
            websiteId,
            websiteCoverageSnapshot: coverage,
            websiteResolutionState: resolution,
            authorizationState,
            acceptedAt: new Date(),
          },
          include: {
            catalogItem: true,
            tenant: true,
            website: true,
            quotations: true,
            assignments: true,
            createdByUser: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        });

        await tx.auditRecord.create({
          data: {
            actorId,
            action: 'complementary_request.accepted',
            entityType: 'ComplementaryServiceRequest',
            entityId: requestId,
            metadata: {
              websiteId,
              resolution,
              authorizationState,
            },
          },
        });
        return updated;
      });

      this.logger.log('complementary_request.accepted', {
        requestId,
        actorId,
        websiteId: accepted.websiteId,
        resolution: accepted.websiteResolutionState,
      });
      return accepted;
    };

    if (idempotencyKey) {
      return this.idempotency.beginOrReplay({
        key: idempotencyKey,
        scope: 'complementary-request.accept:' + requestId,
        actorId,
        execute,
      });
    }
    return execute();
  }
  async addQuotation(
    requestId: string,
    input: {
      amount: number;
      currency?: string;
      notes?: string;
      validUntil?: string;
    },
  ) {
    await this.getAdmin(requestId);
    const quotation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceQuotation.create({
        data: {
          requestId,
          amount: input.amount,
          currency: input.currency ?? 'IRR',
          notes: input.notes,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
        },
      });
      await tx.complementaryServiceRequest.update({
        where: { id: requestId },
        data: { status: ComplementaryRequestStatus.QUOTED },
      });
      return created;
    });

    this.logger.log('complementary_request.quoted', {
      requestId,
      quotationId: quotation.id,
    });
    return quotation;
  }

  async createAssignment(input: {
    requestId: string;
    assigneeNote?: string;
    startedAt?: string;
    amount: number;
    currency?: string;
    interval: BillingInterval;
    periodStartsAt?: string;
    commercialModel?: BillingCommercialModel;
    commercialState?: BillingCommercialState;
    confirmUnauthorized?: boolean;
    actorId?: string;
  }) {
    const request = await this.getAdmin(input.requestId);
    if (request.assignments.length > 0) {
      return request.assignments[0];
    }
    if (request.status !== ComplementaryRequestStatus.ACCEPTED) {
      throw new ConflictException(ERROR_MESSAGES.fa.conflict);
    }
    if (!request.websiteId || !request.tenantId) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    if (input.actorId) {
      await this.commercialAuth.assertAuthorizedOrConfirmed({
        tenantId: request.tenantId,
        preferredUserId: request.createdByUserId,
        confirmUnauthorized: input.confirmUnauthorized,
        actorId: input.actorId,
        action: 'complementary.assignment.unauthorized_override',
        entityType: 'ComplementaryServiceRequest',
        entityId: input.requestId,
      });
    }

    const labelSnapshot =
      request.title ||
      request.catalogItem?.nameFa ||
      request.catalogItem?.nameEn ||
      request.catalogItem?.code ||
      'Complementary service';
    const latestQuotation = request.quotations?.[0];

    const assignment = await this.prisma.$transaction(async (tx) => {
      const startedAt = input.startedAt
        ? new Date(input.startedAt)
        : input.periodStartsAt
          ? new Date(input.periodStartsAt)
          : new Date();
      if (Number.isNaN(startedAt.getTime())) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }

      const created = await tx.serviceAssignment.create({
        data: {
          requestId: input.requestId,
          assigneeNote: input.assigneeNote,
          startedAt,
          authorizationState:
            request.authorizationState ===
            ComplementaryAuthorizationState.AUTHORIZED
              ? ComplementaryAuthorizationState.AUTHORIZED
              : ComplementaryAuthorizationState.NOT_AUTHORIZED_AT_ACTIVATION,
        },
      });
      await tx.complementaryServiceRequest.update({
        where: { id: input.requestId },
        data: { status: ComplementaryRequestStatus.ASSIGNED },
      });

      await this.billing.createComplementaryItem(tx, {
        tenantId: request.tenantId!,
        websiteId: request.websiteId!,
        serviceAssignmentId: created.id,
        sourceQuotationId: latestQuotation?.id ?? null,
        labelSnapshot,
        actorId: input.actorId,
        terms: {
          amount: input.amount,
          currency: input.currency,
          interval: input.interval,
          periodStartsAt: startedAt,
          commercialModel: input.commercialModel,
          commercialState: input.commercialState,
        },
      });

      return created;
    });

    this.logger.log('service_assignment.created', {
      assignmentId: assignment.id,
      requestId: input.requestId,
    });
    return assignment;
  }

  async reconcileDeferredForUser(userId: string, tenantId: string) {
    const deferred = await this.prisma.complementaryServiceRequest.findMany({
      where: {
        createdByUserId: userId,
        websiteTargetType: ComplementaryWebsiteTargetType.TYPED_DOMAIN,
        websiteResolutionState:
          ComplementaryWebsiteResolutionState.DEFERRED_NO_TENANT,
      },
    });

    for (const request of deferred) {
      const domain = this.requireExternalDomain(request.websiteDomain);
      try {
        await this.prisma.$transaction(async (tx) => {
          const existing = await tx.website.findUnique({ where: { domain } });
          if (existing && existing.tenantId !== tenantId) {
            throw new ConflictException(ERROR_MESSAGES.fa.conflict);
          }
          const website =
            existing ??
            (await tx.website.create({
              data: {
                tenantId,
                userId,
                domain,
                displayName: domain,
                managementCoverage:
                  WebsiteManagementCoverage.EXTERNAL_INFRASTRUCTURE,
                status: WebsiteLifecycleStatus.ACTIVE,
                isActive: true,
              },
            }));

          await tx.complementaryServiceRequest.update({
            where: { id: request.id },
            data: {
              tenantId,
              websiteId: website.id,
              websiteCoverageSnapshot: website.managementCoverage,
              websiteResolutionState:
                ComplementaryWebsiteResolutionState.LINKED,
              authorizationState: ComplementaryAuthorizationState.AUTHORIZED,
            },
          });
        });
      } catch (error) {
        this.logger.warn('complementary_request.reconcile_deferred_failed', {
          requestId: request.id,
          userId,
          tenantId,
          reason: error instanceof Error ? error.message : 'unknown',
        });
      }
    }
  }
  async listUsage(params?: {
    assignmentId?: string;
    skip?: number;
    take?: number;
  }) {
    const where = params?.assignmentId
      ? { assignmentId: params.assignmentId }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceUsage.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.serviceUsage.count({ where }),
    ]);
    return { items, total };
  }

  async patchUsage(
    id: string,
    data: {
      label?: string;
      quantity?: number;
      unit?: string | null;
      notes?: string | null;
    },
  ) {
    const existing = await this.prisma.serviceUsage.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return this.prisma.serviceUsage.update({ where: { id }, data });
  }

  async createUsage(input: {
    assignmentId: string;
    label: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }) {
    const assignment = await this.prisma.serviceAssignment.findUnique({
      where: { id: input.assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return this.prisma.serviceUsage.create({ data: input });
  }

  async listDeliverables(params?: {
    assignmentId?: string;
    skip?: number;
    take?: number;
  }) {
    const where = params?.assignmentId
      ? { assignmentId: params.assignmentId }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceDeliverable.findMany({
        where,
        orderBy: { deliveredAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.serviceDeliverable.count({ where }),
    ]);
    return { items, total };
  }

  async patchDeliverable(
    id: string,
    data: { title?: string; description?: string | null },
  ) {
    const existing = await this.prisma.serviceDeliverable.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return this.prisma.serviceDeliverable.update({ where: { id }, data });
  }

  async createDeliverable(input: {
    assignmentId: string;
    title: string;
    description?: string;
  }) {
    const assignment = await this.prisma.serviceAssignment.findUnique({
      where: { id: input.assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    if (!input.title?.trim()) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }
    return this.prisma.serviceDeliverable.create({ data: input });
  }
  private requireExternalDomain(input: string | null | undefined) {
    const domain = normalizeWebsiteDomain(input ?? undefined);
    if (
      !domain ||
      domain.length > 253 ||
      !domain.includes('.') ||
      domain === 'localhost' ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(domain) ||
      !domain
        .split('.')
        .every(
          (label) =>
            label.length > 0 &&
            label.length <= 63 &&
            /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
        )
    ) {
      throw new BadRequestException({
        code: 'INVALID_WEBSITE_DOMAIN',
        message: ERROR_MESSAGES.en.validation,
      });
    }
    return domain;
  }
}
