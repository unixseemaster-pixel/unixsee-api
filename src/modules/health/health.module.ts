import { Module } from '@nestjs/common';

import { MetricsHealthListener } from './listeners/metrics-health.listener.js';
import { AlertsModule } from '../alerts/alerts.module.js';
import { HealthService } from './services/health.service.js';
import { HealthEvaluationService } from './services/health-evaluation.service.js';
import { SystemHealthService } from './services/system-health.service.js';

@Module({
  imports: [AlertsModule],
  providers: [
    HealthService,
    HealthEvaluationService,
    MetricsHealthListener,
    SystemHealthService,
  ],
  exports: [HealthService, HealthEvaluationService, SystemHealthService],
})
export class HealthModule {}
