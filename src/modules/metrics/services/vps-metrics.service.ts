import { Injectable } from '@nestjs/common';

import { VpsMetricsRepository } from '../repositories/vps-metrics.repository.js';
import { MetricsAggregationService } from './metrics-aggregation.service.js';
import { MetricsInterpretationService } from './metrics-interpretation.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class VpsMetricsService {
  private readonly logger = createAppLogger(VpsMetricsService.name);

  constructor(
    private vpsMetricsRepository: VpsMetricsRepository,
    private aggregationService: MetricsAggregationService,
    private interpretationService: MetricsInterpretationService,
  ) {}

  async getVpsOverview(vpsNodeId: string) {
    const latest = await this.vpsMetricsRepository.findLatestByVpsId(vpsNodeId);

    const cpu = latest?.cpuUsagePercent;
    const memory = latest?.memoryUsedMB;

    this.logger.debug('metrics.vps_overview.loaded', {
      vpsNodeId,
      hasMetric: Boolean(latest),
      recordedAt: latest?.recordedAt,
    });

    return {
      cpu,
      memory,
      cpuStatus: this.interpretationService.interpretCpu(cpu || 0),
    };
  }
}
