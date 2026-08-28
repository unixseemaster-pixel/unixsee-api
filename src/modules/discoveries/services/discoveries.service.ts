import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { CommercialAuthorizationService } from '#/common/tenancy/commercial-authorization.service.js';
import {
  DiscoveryStatus,
  WebsiteManagementCoverage,
} from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Injectable()
export class DiscoveriesService {
  private readonly logger = createAppLogger(DiscoveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commercialAuth: CommercialAuthorizationService,
  ) {}

  async list(params?: {
    status?: DiscoveryStatus;
    skip?: number;
    take?: number;
  }) {
    const where = params?.status ? { status: params.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.websiteDiscovery.findMany({
        where,
        include: { server: true, vpsNode: true, website: true },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.websiteDiscovery.count({ where }),
    ]);
    return { items, total };
  }

  async get(id: string) {
    const discovery = await this.prisma.websiteDiscovery.findUnique({
      where: { id },
      include: { server: true, vpsNode: true, website: true },
    });
    if (!discovery) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return discovery;
  }

  async assign(
    id: string,
    input: {
      tenantId: string;
      userId?: string;
      planId?: string;
      confirmUnauthorized?: boolean;
      actorId: string;
    },
  ) {
    const discovery = await this.get(id);
    if (!input.tenantId) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    await this.commercialAuth.assertAuthorizedOrConfirmed({
      tenantId: input.tenantId,
      preferredUserId: input.userId,
      confirmUnauthorized: input.confirmUnauthorized,
      actorId: input.actorId,
      action: 'discovery.assign.unauthorized_override',
      entityType: 'WebsiteDiscovery',
      entityId: id,
    });

    let vpsNodeId = discovery.vpsNodeId;
    if (!vpsNodeId) {
      const firstNode = await this.prisma.vpsNode.findFirst({
        where: { serverId: discovery.serverId },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstNode) {
        throw new BadRequestException(ERROR_MESSAGES.fa.validation);
      }
      vpsNodeId = firstNode.id;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existingWebsite = await tx.website.findUnique({
        where: { domain: discovery.domain },
      });

      const website = existingWebsite
        ? await tx.website.update({
            where: { id: existingWebsite.id },
            data: {
              tenantId: input.tenantId,
              userId: input.userId ?? existingWebsite.userId,
              vpsNodeId,
              managementCoverage: WebsiteManagementCoverage.UNIXSEE_MANAGED,
              ...(input.planId !== undefined
                ? { planId: input.planId, planActivatedAt: null }
                : {}),
              displayName: discovery.displayName ?? existingWebsite.displayName,
              directAdminUser:
                discovery.directAdminUser ?? existingWebsite.directAdminUser,
              homeDirectory:
                discovery.homeDirectory ?? existingWebsite.homeDirectory,
              documentRoot:
                discovery.documentRoot ?? existingWebsite.documentRoot,
              isActive: true,
            },
          })
        : await tx.website.create({
            data: {
              domain: discovery.domain,
              tenantId: input.tenantId,
              userId: input.userId,
              vpsNodeId,
              managementCoverage: WebsiteManagementCoverage.UNIXSEE_MANAGED,
              planId: input.planId,
              planActivatedAt: null,
              displayName: discovery.displayName,
              directAdminUser: discovery.directAdminUser,
              homeDirectory: discovery.homeDirectory,
              documentRoot: discovery.documentRoot,
              isActive: true,
            },
          });

      const updatedDiscovery = await tx.websiteDiscovery.update({
        where: { id },
        data: {
          status: DiscoveryStatus.ASSIGNED,
          websiteId: website.id,
          vpsNodeId,
          assignedAt: new Date(),
        },
        include: { website: true, server: true, vpsNode: true },
      });

      return updatedDiscovery;
    });

    this.logger.log('discovery.assigned', {
      discoveryId: id,
      websiteId: result.websiteId,
      tenantId: input.tenantId,
    });
    return result;
  }
}
