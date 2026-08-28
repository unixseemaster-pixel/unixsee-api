import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AuditModule } from '#/modules/audit/audit.module.js';

import { AdminBillingController } from './controllers/admin-billing.controller.js';
import { BillingController } from './controllers/billing.controller.js';
import { CustomerBillingController } from './controllers/customer-billing.controller.js';
import { BillingExpiryService } from './services/billing-expiry.service.js';
import { BillingService } from './services/billing.service.js';

@Module({
  imports: [ScheduleModule.forRoot(), AuditModule],
  providers: [BillingService, BillingExpiryService],
  controllers: [
    AdminBillingController,
    BillingController,
    CustomerBillingController,
  ],
  exports: [BillingService],
})
export class BillingModule {}
