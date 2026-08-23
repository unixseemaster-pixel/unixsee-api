import { Module } from '@nestjs/common';

import { MetricsOverviewService } from './services/metrics-overview.service.js';
import { VpsMetricsService } from './services/vps-metrics.service.js';
import { WebMetricsService } from './services/web-metrics.service.js';
import { MetricsAggregationService } from './services/metrics-aggregation.service.js';
import { MetricsInterpretationService } from './services/metrics-interpretation.service.js';
import { TrafficLoadService } from './services/traffic-load.service.js';
import { VpsMetricsRepository } from './repositories/vps-metrics.repository.js';
import { WebMetricsRepository } from './repositories/web-metrics.repository.js';
import { HealthModule } from '../health/health.module.js';
import { AlertsModule } from '../alerts/alerts.module.js';

@Module({
  imports: [HealthModule, AlertsModule],
  providers: [
    MetricsOverviewService,
    VpsMetricsService,
    WebMetricsService,
    MetricsAggregationService,
    MetricsInterpretationService,
    TrafficLoadService,
    VpsMetricsRepository,
    WebMetricsRepository,
  ],
  exports: [
    MetricsOverviewService,
    VpsMetricsService,
    WebMetricsService,
    MetricsAggregationService,
    MetricsInterpretationService,
    TrafficLoadService,
    VpsMetricsRepository,
    WebMetricsRepository,
  ],
})
export class MetricsModule {}
