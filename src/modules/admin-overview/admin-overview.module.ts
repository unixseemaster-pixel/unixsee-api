import { Module } from '@nestjs/common';

import { AdminOverviewController } from './controllers/admin-overview.controller.js';
import { AdminOverviewService } from './services/admin-overview.service.js';

@Module({
  providers: [AdminOverviewService],
  controllers: [AdminOverviewController],
  exports: [AdminOverviewService],
})
export class AdminOverviewModule {}
