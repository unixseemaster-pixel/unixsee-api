import { Module } from '@nestjs/common';
import { MetricsService } from './services/metrics/metrics.service';
import { VpsMetricsService } from './services/vps-metrics.service';
import { WebMetricsService } from './services/web-metrics.service';
import { MetricsAggregationService } from './services/metrics-aggregation.service';
import { MetricsInterpretationService } from './services/metrics-interpretation.service';
import { MetricsOverviewService } from './services/metrics-overview.service';
import { VpsMetricsRepositoryService } from './repositories/vps-metrics-repository.service';

@Module({
  providers: [MetricsService, VpsMetricsService, WebMetricsService, MetricsAggregationService, MetricsInterpretationService, MetricsOverviewService, VpsMetricsRepositoryService]
})
export class MetricsModule {}
