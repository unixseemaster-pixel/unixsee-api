import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { IdempotencyService } from '#/common/idempotency/idempotency.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import {
  OperationalActionStatus,
  OperationalActionType,
} from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Injectable()
export class OperationalActionsService {
  private readonly logger = createAppLogger(OperationalActionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async createForWebsite(
    userId: string,
    websiteId: string,
    input: { type: OperationalActionType },
    idempotencyKey?: string,
  ) {
    await this.tenantAccess.assertWebsiteAccess(userId, websiteId);

    const execute = async () => {
      const action = await this.prisma.operationalAction.create({
        data: {
          websiteId,
          requesterId: userId,
          type: input.type,
          status: OperationalActionStatus.QUEUED,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      });

      this.logger.log('operational_action.created', {
        actionId: action.id,
        websiteId,
        type: action.type,
      });
      return action;
    };

    if (idempotencyKey) {
      return this.idempotency.beginOrReplay({
        key: idempotencyKey,
        scope: `operational-action.create:${websiteId}`,
        actorId: userId,
        execute,
      });
    }

    return execute();
  }

  async getForWebsite(userId: string, websiteId: string, actionId: string) {
    await this.tenantAccess.assertWebsiteAccess(userId, websiteId);
    const action = await this.prisma.operationalAction.findFirst({
      where: { id: actionId, websiteId },
    });
    if (!action) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }
    return action;
  }

  async listAdmin(params?: {
    status?: OperationalActionStatus;
    skip?: number;
    take?: number;
  }) {
    const where = params?.status ? { status: params.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.operationalAction.findMany({
        where,
        include: {
          website: { select: { id: true, domain: true, tenantId: true } },
          requester: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params?.skip ?? 0,
        take: params?.take ?? 50,
      }),
      this.prisma.operationalAction.count({ where }),
    ]);
    return { items, total };
  }

  async retry(actionId: string, actorId: string, idempotencyKey?: string) {
    const execute = async () => {
      const action = await this.prisma.operationalAction.findUnique({
        where: { id: actionId },
      });
      if (!action) {
        throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
      }
      if (action.status !== OperationalActionStatus.FAILED) {
        throw new ConflictException(ERROR_MESSAGES.fa.conflict);
      }

      const updated = await this.prisma.operationalAction.update({
        where: { id: actionId },
        data: {
          status: OperationalActionStatus.QUEUED,
          resultMessage: null,
          startedAt: null,
          finishedAt: null,
        },
      });

      this.logger.log('operational_action.retried', {
        actionId,
        actorId,
      });
      return updated;
    };

    if (idempotencyKey) {
      return this.idempotency.beginOrReplay({
        key: idempotencyKey,
        scope: `operational-action.retry:${actionId}`,
        actorId,
        execute,
      });
    }

    return execute();
  }

  assertActionType(type: string): asserts type is OperationalActionType {
    if (
      type !== OperationalActionType.CACHE_CLEAR &&
      type !== OperationalActionType.OTHER
    ) {
      throw new BadRequestException(ERROR_MESSAGES.fa.validation);
    }
  }
}
