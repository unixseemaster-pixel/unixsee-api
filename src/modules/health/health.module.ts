import { Module } from '@nestjs/common';

import { MetricsHealthListener } from './listeners/metrics-health.listener.js';
import { AlertsModule } from '../alerts/alerts.module.js';
import { HealthService } from './services/health.service.js';
import { HealthEvaluationService } from './services/health-evaluation.service.js';

@Module({
  imports: [AlertsModule],
  providers: [HealthService, HealthEvaluationService, MetricsHealthListener],
})
export class HealthModule {}

// import { Module } from '@nestjs/common';

// import { HealthService } from './services/health.service.js';
// import { HealthEvaluationService } from './services/health-evaluation.service.js';
// import { AlertsModule } from '../alerts/alerts.module.js';

// @Module({
//   imports: [AlertsModule],
//   providers: [HealthService, HealthEvaluationService],
// })
// export class HealthModule {}
