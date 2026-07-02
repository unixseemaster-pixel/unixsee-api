import { Injectable } from '@nestjs/common';

import { WebMetricsService } from './web-metrics.service.js';
import { TrafficLoadService } from './traffic-load.service.js';
import { AlertsService } from '#/modules/alerts/services/alerts.service.js';
import { SystemHealthService } from '#/modules/health/services/system-health.service.js';

@Injectable()
export class MetricsOverviewService {
  constructor(
    private readonly webMetricsService: WebMetricsService,
    private readonly systemHealthService: SystemHealthService,
    private readonly alertsService: AlertsService,
    private readonly trafficLoadService: TrafficLoadService,
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

      const concurrentRequests = website.latestMetric.concurrentRequests ?? 0;
      const requestRate = website.latestMetric.requestRate ?? 0;
      const traffic = this.trafficLoadService.resolve(
        website.latestMetric.recordedAt
          ? {
              concurrentRequests,
              requestRate,
            }
          : null,
      );

      return {
        websiteId: website.websiteId,
        vpsNodeId: website.vpsNodeId,
        domain: website.domain,
        displayName: website.displayName,
        isActive: website.isActive,

        lastCheckedAt:
          website.latestProbe.recordedAt ?? website.latestMetric.recordedAt,

        status: this.systemHealthService.calculate({
          concurrentRequests,
          isUp: website.latestProbe.isUp,
          alerts: websiteAlerts.map((alert) => ({
            status: alert.severity.toLowerCase(),
          })),
        }),

        traffic,
        availability: {
          isUp: website.latestProbe.isUp,
          statusCode: website.latestProbe.statusCode,
          responseTimeMs: website.latestProbe.responseTimeMs,
          ttfbMs: website.latestProbe.ttfbMs,
          errorMessage: website.latestProbe.errorMessage,
          lastProbeAt: website.latestProbe.recordedAt,
        },
      };
    });

    const totalTraffic = this.trafficLoadService.resolve(
      websites.some((website) => website.latestMetric.recordedAt)
        ? {
            concurrentRequests: websites.reduce(
              (total, website) =>
                total + (website.latestMetric.concurrentRequests ?? 0),
              0,
            ),
            requestRate: websites.reduce(
              (total, website) =>
                total + (website.latestMetric.requestRate ?? 0),
              0,
            ),
          }
        : null,
    );

    return {
      status: this.resolveGlobalStatus(websiteOverviews),

      websites: websiteOverviews,
      totals: {
        trafficLoad: totalTraffic.load,
        trafficActivity: totalTraffic.activity,
        averageResponseTimeMs: this.averageNullable(
          websites.map((website) => website.latestProbe.responseTimeMs),
        ),
        websitesUp: websites.filter(
          (website) => website.latestProbe.isUp === true,
        ).length,
        websitesChecked: websites.filter(
          (website) => website.latestProbe.isUp !== null,
        ).length,
      },
    };
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

  private averageNullable(values: Array<number | null | undefined>) {
    const numericValues = values.filter(
      (value): value is number => typeof value === 'number',
    );

    if (numericValues.length === 0) return null;

    return Math.round(
      numericValues.reduce((total, value) => total + value, 0) /
        numericValues.length,
    );
  }
}
