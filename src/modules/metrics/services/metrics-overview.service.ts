import { Injectable } from '@nestjs/common';
import { WebMetricsService } from './web-metrics.service.js';
import { AlertsService } from '#/modules/alerts/services/alerts.service.js';
import { MetricsAggregationService } from './metrics-aggregation.service.js';
import { WebsiteMetricsType } from '../types/web-metrics.type.js';

@Injectable()
export class MetricsOverviewService {
  constructor(
    private webMetricsService: WebMetricsService,
    private metricAggregationService: MetricsAggregationService,
  ) {}

  async getOverview(userId: string) {
    const websites =
      await this.webMetricsService.getWebsitesOverviewByUser(userId);

    const activeVisitors = this.sumActiveVisitors(websites);
    const uptime = this.calculateSyntheticUptime(websites);
    const trafficStatus = this.resolveTrafficStatus(websites);

    return {
      status: this.resolveSystemStatus(websites),

      uptime,

      activeVisitors,

      trafficStatus,

      websites,
    };
  }

  private sumActiveVisitors(websites: WebsiteMetricsType[]) {
    return websites.reduce(
      (sum, w) => sum + (w.latestMetric.activeVisitors ?? 0),
      0,
    );
  }

  private calculateSyntheticUptime(websites: WebsiteMetricsType[]) {
    if (!websites.length) return 100;

    const activeRatio =
      websites.filter((w) => w.latestMetric.activeVisitors > 0).length /
      websites.length;

    return Math.round(activeRatio * 100);
  }

  private resolveSystemStatus(websites: WebsiteMetricsType[]) {
    const totalVisitors = this.sumActiveVisitors(websites);

    if (totalVisitors > 500) return 'warning';
    if (totalVisitors > 200) return 'monitoring';
    return 'healthy';
  }

  private resolveTrafficStatus(websites: WebsiteMetricsType[]) {
    const totalVisitors = this.sumActiveVisitors(websites);

    if (totalVisitors > 500) return 'high';
    if (totalVisitors > 200) return 'medium';
    return 'normal';
  }
}
