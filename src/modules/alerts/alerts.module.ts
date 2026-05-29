import { Module } from '@nestjs/common';

import { AlertsService } from './services/alerts.service.js';
import { AlertsController } from './controllers/alerts.controller.js';
import { AlertsRepository } from './repositories/alerts.repository.js';
import { HealthService } from '../health/services/health.service.js';

@Module({
  providers: [AlertsService, AlertsRepository, HealthService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
