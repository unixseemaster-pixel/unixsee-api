import { Module } from '@nestjs/common';

import { AlertsService } from './services/alerts.service.js';
import { AlertsController } from './controllers/alerts.controller.js';
import { AlertsRepository } from './repositories/alerts.repository.js';

@Module({
  providers: [AlertsService, AlertsRepository],
  controllers: [AlertsController],
  exports: [AlertsService, AlertsRepository],
})
export class AlertsModule {}
