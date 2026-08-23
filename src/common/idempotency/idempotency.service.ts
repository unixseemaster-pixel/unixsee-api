import { ConflictException, Injectable } from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Injectable()
export class IdempotencyService {
  private readonly logger = createAppLogger(IdempotencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async beginOrReplay<T>(params: {
    key: string;
    scope: string;
    actorId?: string | null;
    execute: () => Promise<T>;
  }): Promise<T> {
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: {
        scope_key: {
          scope: params.scope,
          key: params.key,
        },
      },
    });

    if (existing) {
      this.logger.debug('idempotency.replay', {
        scope: params.scope,
        key: params.key,
      });
      return existing.responseJson as T;
    }

    try {
      const result = await params.execute();

      await this.prisma.idempotencyRecord.create({
        data: {
          key: params.key,
          scope: params.scope,
          actorId: params.actorId ?? null,
          responseJson: result as object,
        },
      });

      return result;
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
}
