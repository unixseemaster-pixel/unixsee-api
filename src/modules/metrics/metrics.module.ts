import { Module } from '@nestjs/common';
import { MetricsOverviewService } from './services/metrics-overview.service.js';
import { VpsMetricsService } from './services/vps-metrics.service.js';
import { WebMetricsService } from './services/web-metrics.service.js';
import { MetricsAggregationService } from './services/metrics-aggregation.service.js';
import { MetricsInterpretationService } from './services/metrics-interpretation.service.js';
import { TrafficLoadService } from './services/traffic-load.service.js';
import { SystemHealthService } from '../health/services/system-health.service.js';
import { AlertsService } from '../alerts/services/alerts.service.js';
import { VpsMetricsRepository } from './repositories/vps-metrics.repository.js';
import { WebMetricsRepository } from './repositories/web-metrics.repository.js';
import { AlertsRepository } from '../alerts/repositories/alerts.repository.js';

@Module({
  providers: [
    MetricsOverviewService,
    VpsMetricsService,
    WebMetricsService,
    MetricsAggregationService,
    MetricsInterpretationService,
    TrafficLoadService,
    MetricsOverviewService,
    SystemHealthService,
    AlertsService,
    VpsMetricsRepository,
    WebMetricsRepository,
    AlertsRepository,
  ],
})
export class MetricsModule {}
