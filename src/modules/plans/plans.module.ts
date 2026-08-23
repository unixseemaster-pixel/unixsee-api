import { Module } from '@nestjs/common';

import { AdminPlansController } from './controllers/admin-plans.controller.js';
import { PlansController } from './controllers/plans.controller.js';
import { PublicPlansController } from './controllers/public-plans.controller.js';
import { PlansService } from './services/plans.service.js';

@Module({
  providers: [PlansService],
  controllers: [
    PublicPlansController,
    PlansController,
    AdminPlansController,
  ],
  exports: [PlansService],
})
export class PlansModule {}
