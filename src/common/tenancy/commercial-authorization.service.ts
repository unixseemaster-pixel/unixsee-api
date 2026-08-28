import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { MembershipRole } from '#/generated/prisma/enums.js';
import { AuditService } from '#/modules/audit/services/audit.service.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

export type CommercialPrincipalCheck = {
  principalUserId: string;
  authorized: boolean;
  overridden: boolean;
};

/**
 * Staff commercial applyments: allow when principal is authorized, or when
 * staff explicitly confirms override (ADR 0016 / 1A).
 */
@Injectable()
export class CommercialAuthorizationService {
  private readonly logger = createAppLogger(
    CommercialAuthorizationService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async resolvePrincipalUserId(params: {
    tenantId: string;
    preferredUserId?: string | null;
  }): Promise<string> {
    if (params.preferredUserId) {
      const preferred = await this.prisma.user.findUnique({
        where: { id: params.preferredUserId },
        select: { id: true },
      });
      if (preferred) {
        return preferred.id;
      }
    }

    const owner = await this.prisma.membership.findFirst({
      where: {
        tenantId: params.tenantId,
        role: MembershipRole.OWNER,
      },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });

    if (owner) {
      return owner.userId;
    }

    const anyMember = await this.prisma.membership.findFirst({
      where: { tenantId: params.tenantId },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });

    if (!anyMember) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    return anyMember.userId;
  }

  async assertAuthorizedOrConfirmed(params: {
    tenantId: string;
    preferredUserId?: string | null;
    confirmUnauthorized?: boolean;
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
  }): Promise<CommercialPrincipalCheck> {
    const principalUserId = await this.resolvePrincipalUserId({
      tenantId: params.tenantId,
      preferredUserId: params.preferredUserId,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: principalUserId },
      select: { id: true, authorized: true },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    if (user.authorized) {
      return {
        principalUserId: user.id,
        authorized: true,
        overridden: false,
      };
    }

    if (!params.confirmUnauthorized) {
      this.logger.warn('commercial.unauthorized_confirm_required', {
        tenantId: params.tenantId,
        principalUserId: user.id,
        action: params.action,
        actorId: params.actorId,
      });
      throw new ForbiddenException({
        code: 'COMMERCIAL_UNAUTHORIZED_CONFIRM_REQUIRED',
        message: ERROR_MESSAGES.fa.forbidden,
      });
    }

    await this.audit.record({
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: {
        unauthorizedOverride: true,
        principalUserId: user.id,
        tenantId: params.tenantId,
        authorizedAtTime: false,
      },
    });

    this.logger.log('commercial.unauthorized_override', {
      tenantId: params.tenantId,
      principalUserId: user.id,
      action: params.action,
      actorId: params.actorId,
    });

    return {
      principalUserId: user.id,
      authorized: false,
      overridden: true,
    };
  }
}
