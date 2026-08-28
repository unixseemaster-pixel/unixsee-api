import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import {
  MembershipRole,
  UserAccountStatus,
} from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Injectable()
export class TenantsService {
  private readonly logger = createAppLogger(TenantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMyTenant(userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      throw new NotFoundException(ERROR_MESSAGES.fa.tenantRequired);
    }

    return membership.tenant;
  }

  async getMyMembers(userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      throw new NotFoundException(ERROR_MESSAGES.fa.forbidden);
    }

    return this.prisma.membership.findMany({
      where: { tenantId: membership.tenantId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            username: true,
            status: true,
            locale: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listAdmin(params?: { skip?: number; take?: number; search?: string }) {
    const where = params?.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' as const } },
            {
              displayName: {
                contains: params.search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        include: {
          _count: { select: { memberships: true, websites: true } },
          memberships: {
            where: { role: 'OWNER' },
            include: {
              user: {
                select: {
                  fullName: true,
                  phoneNumber: true,
                },
              },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { items, total };
  }

  async getAdmin(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
                username: true,
                status: true,
              },
            },
          },
        },
        websites: {
          select: { id: true, domain: true, status: true, isActive: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    return tenant;
  }

  async createTenant(input: {
    name?: string;
    displayName?: string;
    ownerUserId: string;
  }) {
    const tenant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          ...(input.name ? { name: input.name } : {}),
          displayName: input.displayName ?? input.name,
        },
      });

      await tx.membership.create({
        data: {
          tenantId: created.id,
          userId: input.ownerUserId,
          role: MembershipRole.OWNER,
        },
      });

      return created;
    });

    this.logger.log('tenant.created', {
      tenantId: tenant.id,
      ownerUserId: input.ownerUserId,
    });

    return tenant;
  }

  async updateTenant(
    tenantId: string,
    data: {
      name?: string;
      displayName?: string;
      status?: UserAccountStatus;
    },
  ) {
    await this.getAdmin(tenantId);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async ensurePersonalTenantForUser(userId: string, nameHint?: string) {
    const existing = await this.prisma.membership.findFirst({
      where: { userId },
      include: { tenant: true },
    });

    if (existing) {
      return existing.tenant;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    return this.createTenant({
      name: nameHint ?? user.fullName ?? user.username ?? undefined,
      displayName: user.fullName ?? user.username ?? undefined,
      ownerUserId: userId,
    });
  }

  async createMembership(input: {
    userId: string;
    tenantId: string;
    role?: MembershipRole;
  }) {
    try {
      return await this.prisma.membership.create({
        data: {
          userId: input.userId,
          tenantId: input.tenantId,
          role: input.role ?? MembershipRole.VIEWER,
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new ConflictException(ERROR_MESSAGES.fa.conflict);
      }
      throw error;
    }
  }

  async updateMembership(
    membershipId: string,
    data: { role?: MembershipRole },
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });
    if (!membership) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (
      membership.role === MembershipRole.OWNER &&
      data.role &&
      data.role !== MembershipRole.OWNER
    ) {
      const owners = await this.prisma.membership.count({
        where: {
          tenantId: membership.tenantId,
          role: MembershipRole.OWNER,
        },
      });
      if (owners <= 1) {
        throw new ConflictException(ERROR_MESSAGES.fa.conflict);
      }
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data,
    });
  }

  async listMembershipsAdmin(params?: { tenantId?: string }) {
    return this.prisma.membership.findMany({
      where: params?.tenantId ? { tenantId: params.tenantId } : undefined,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
          },
        },
        tenant: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
