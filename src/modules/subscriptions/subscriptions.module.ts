import { Module } from '@nestjs/common';

import { PublicSubscriptionsController } from './controllers/public-subscriptions.controller.js';
import { SubscriptionsService } from './services/subscriptions.service.js';

@Module({
  controllers: [PublicSubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
