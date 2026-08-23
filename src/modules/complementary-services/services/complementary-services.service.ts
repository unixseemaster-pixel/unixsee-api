import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import { ComplementaryRequestStatus } from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Injectable()
export class ComplementaryServicesService {
  private readonly logger = createAppLogger(ComplementaryServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
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

  async listForUser(userId: string, params?: { skip?: number; take?: number }) {
    const tenantIds = await this.tenantAccess.getAccessibleTenantIds(userId);
    const where = { tenantId: { in: tenantIds } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.complementaryServiceRequest.findMany({
        where,
        include: { catalogItem: true, quotations: true },
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
    if (!request?.tenantId) {
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
  }) {
    const request = await this.getAdmin(input.requestId);
    if (request.status === ComplementaryRequestStatus.WITHDRAWN) {
      throw new ConflictException(ERROR_MESSAGES.fa.conflict);
    }

    const assignment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceAssignment.create({
        data: {
          requestId: input.requestId,
          assigneeNote: input.assigneeNote,
          startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
        },
      });
      await tx.complementaryServiceRequest.update({
        where: { id: input.requestId },
        data: { status: ComplementaryRequestStatus.ASSIGNED },
      });
      return created;
    });

    this.logger.log('service_assignment.created', {
      assignmentId: assignment.id,
      requestId: input.requestId,
    });
    return assignment;
  }

  async listUsage(params?: { assignmentId?: string; skip?: number; take?: number }) {
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
    const existing = await this.prisma.serviceUsage.findUnique({ where: { id } });
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
}
