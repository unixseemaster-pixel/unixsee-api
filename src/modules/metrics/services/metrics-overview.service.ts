import { Injectable } from '@nestjs/common';

import { WebMetricsService } from './web-metrics.service.js';
import { AlertsService } from '#/modules/alerts/services/alerts.service.js';
import { SystemHealthService } from '#/modules/health/services/system-health.service.js';

@Injectable()
export class MetricsOverviewService {
  constructor(
    private readonly webMetricsService: WebMetricsService,
    private readonly systemHealthService: SystemHealthService,
    private readonly alertsService: AlertsService,
  ) {}

  async getOverview(userId: string) {
    const [websites, alerts] = await Promise.all([
      this.webMetricsService.getWebsitesOverviewByUser(userId),
      this.alertsService.getRecentAlerts(userId),
    ]);

    const websiteOverviews = websites.map((website) => {
      const websiteAlerts = alerts.filter(
        (alert) => alert.websiteId === website.websiteId,
      );

      const activeVisitors = website.latestMetric.activeVisitors ?? 0;

      return {
        websiteId: website.websiteId,

        activeVisitors,

        requestRate: website.latestMetric.requestRate ?? 0,

        lastCheckedAt: website.latestMetric.recordedAt,

        status: this.systemHealthService.calculate({
          activeVisitors,
          alerts: websiteAlerts,
        }),

        trafficStatus: this.resolveTrafficStatus(activeVisitors),
      };
    });

    return {
      status: this.resolveGlobalStatus(websiteOverviews),

      websites: websiteOverviews,
    };
  }

  private resolveTrafficStatus(activeVisitors: number) {
    if (activeVisitors > 500) {
      return 'high';
    }

    if (activeVisitors > 200) {
      return 'medium';
    }

    return 'normal';
  }

  private resolveGlobalStatus(
    websites: {
      status: string;
    }[],
  ) {
    if (websites.some((website) => website.status === 'critical')) {
      return 'critical';
    }

    if (websites.some((website) => website.status === 'warning')) {
      return 'warning';
    }

    if (websites.some((website) => website.status === 'monitoring')) {
      return 'monitoring';
    }

    return 'healthy';
  }
}
