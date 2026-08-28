import { ConflictException, Injectable } from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { NewsletterSubscriptionStatus } from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Injectable()
export class SubscriptionsService {
  private readonly logger = createAppLogger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async subscribePublic(input: {
    email: string;
    locale?: string;
    source?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.newsletterSubscription.findUnique({
      where: { email },
    });

    if (existing?.status === NewsletterSubscriptionStatus.ACTIVE) {
      this.logger.warn('newsletter.already_subscribed', { email });
      throw new ConflictException({
        code: 'ALREADY_SUBSCRIBED',
        message: ERROR_MESSAGES.en.conflict,
      });
    }

    if (existing) {
      const reactivated = await this.prisma.newsletterSubscription.update({
        where: { id: existing.id },
        data: {
          status: NewsletterSubscriptionStatus.ACTIVE,
          locale: input.locale ?? existing.locale,
          source: input.source ?? existing.source,
          consentedAt: new Date(),
          unsubscribedAt: null,
        },
      });

      this.logger.log('newsletter.reactivated', {
        subscriptionId: reactivated.id,
        email,
      });

      return {
        id: reactivated.id,
        email: reactivated.email,
        status: reactivated.status,
        locale: reactivated.locale,
        source: reactivated.source,
        consentedAt: reactivated.consentedAt.toISOString(),
        created: false,
      };
    }

    const created = await this.prisma.newsletterSubscription.create({
      data: {
        email,
        locale: input.locale,
        source: input.source,
        status: NewsletterSubscriptionStatus.ACTIVE,
      },
    });

    this.logger.log('newsletter.subscribed', {
      subscriptionId: created.id,
      email,
      source: created.source,
    });

    return {
      id: created.id,
      email: created.email,
      status: created.status,
      locale: created.locale,
      source: created.source,
      consentedAt: created.consentedAt.toISOString(),
      created: true,
    };
  }
}
