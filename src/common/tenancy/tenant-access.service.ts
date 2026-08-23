import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import {
  MembershipRole,
  Role,
} from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Injectable()
export class TenantAccessService {
  private readonly logger = createAppLogger(TenantAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMembershipsForUser(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async requireMembership(
    userId: string,
    tenantId: string,
    allowedRoles?: MembershipRole[],
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      include: { tenant: true },
    });

    if (!membership) {
      this.logger.warn('tenant.access.membership_missing', { userId, tenantId });
      throw new ForbiddenException(ERROR_MESSAGES.fa.forbidden);
    }

    if (allowedRoles?.length && !allowedRoles.includes(membership.role)) {
      this.logger.warn('tenant.access.role_rejected', {
        userId,
        tenantId,
        role: membership.role,
      });
      throw new ForbiddenException(ERROR_MESSAGES.fa.forbidden);
    }

    return membership;
  }

  async resolvePrimaryTenantId(userId: string): Promise<string> {
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    if (!membership) {
      this.logger.warn('tenant.access.no_membership', { userId });
      throw new ForbiddenException(ERROR_MESSAGES.fa.tenantRequired);
    }

    return membership.tenantId;
  }

  async assertWebsiteAccess(userId: string, websiteId: string) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
      select: { id: true, tenantId: true },
    });

    if (!website) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    await this.requireMembership(userId, website.tenantId);
    return website;
  }

  async getAccessibleTenantIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { tenantId: true },
    });
    return memberships.map((m) => m.tenantId);
  }

  isStaffRole(role: Role | string | undefined): boolean {
    return role === Role.ADMIN || role === Role.OPERATOR;
  }
}
