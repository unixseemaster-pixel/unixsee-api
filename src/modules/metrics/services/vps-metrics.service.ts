import { Injectable } from '@nestjs/common';

import { VpsMetricsRepository } from '../repositories/vps-metrics.repository.js';
import { MetricsAggregationService } from './metrics-aggregation.service.js';
import { MetricsInterpretationService } from './metrics-interpretation.service.js';

@Injectable()
export class VpsMetricsService {
  constructor(
    private vpsMetricsRepository: VpsMetricsRepository,
    private aggregationService: MetricsAggregationService,
    private interpretationService: MetricsInterpretationService,
  ) {}

  async getVpsOverview(vpsNodeId: string) {
    const latest = await this.vpsMetricsRepository.findLatestByVpsId(vpsNodeId);

    const cpu = latest?.cpuUsagePercent;
    const memory = latest?.memoryUsedMB;

    return {
      cpu,
      memory,
      cpuStatus: this.interpretationService.interpretCpu(cpu || 0),
    };
  }
}
