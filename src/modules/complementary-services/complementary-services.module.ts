import { Module } from '@nestjs/common';

import { BillingModule } from '#/modules/billing/billing.module.js';

import { AdminComplementaryServicesController } from './controllers/admin-complementary-services.controller.js';
import { ComplementaryServicesController } from './controllers/complementary-services.controller.js';
import { PublicComplementaryServicesController } from './controllers/public-complementary-services.controller.js';
import { ComplementaryServicesService } from './services/complementary-services.service.js';

@Module({
  imports: [BillingModule],
  providers: [ComplementaryServicesService],
  controllers: [
    PublicComplementaryServicesController,
    ComplementaryServicesController,
    AdminComplementaryServicesController,
  ],
  exports: [ComplementaryServicesService],
})
export class ComplementaryServicesModule {}
