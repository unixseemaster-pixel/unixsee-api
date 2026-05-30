import { Injectable } from '@nestjs/common';

import { AlertsService } from '#/modules/alerts/services/alerts.service.js';
import { SystemHealthService } from '#/modules/health/services/system-health.service.js';
import { MetricsOverviewService } from '#/modules/metrics/services/metrics-overview.service.js';
import { SslCertificatesService } from '#/modules/ssl-certificates/services/ssl-certificates.service.js';
import { WebsitesService } from '#/modules/websites/services/websites.service.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly metricsOverviewService: MetricsOverviewService,
    private readonly alertsService: AlertsService,
    private readonly websitesService: WebsitesService,
    private readonly sslCertificatesService: SslCertificatesService,
    private readonly systemHealthService: SystemHealthService,
  ) {}

  async getOverview(userId: string) {
    const [metricsOverview, recentAlerts, expiringCertificates] =
      await Promise.all([
        this.metricsOverviewService.getOverview(userId),
        this.alertsService.getRecentAlerts(userId),
        this.websitesService.getUserWebsites(userId),
        this.sslCertificatesService.getExpiringCertificates(userId),
      ]);

    const websiteAlertsMap = new Map<string, typeof recentAlerts>();

    for (const alert of recentAlerts) {
      if (!alert.websiteId) return;

      const existing = websiteAlertsMap.get(alert.websiteId) ?? [];
      websiteAlertsMap.set(alert.websiteId, [...existing, alert]);
    }

    const websitesView = metricsOverview.websites.map((website) => {
      const websiteAlerts = websiteAlertsMap.get(website.websiteId) ?? [];

      return {
        websiteId: website.websiteId,
        activeVisitors: website.activeVisitors,
        requestRate: website.requestRate,
        lastCheckedAt: website.lastCheckedAt,

        status: this.systemHealthService.calculate({
          activeVisitors: website.activeVisitors,
          alerts: websiteAlerts,
        }),

        trafficStatus: this.resolveTrafficLabel(website.activeVisitors),
      };
    });

    return {
      status: metricsOverview.status,

      message: this.resolveStatusMessage(metricsOverview.status),

      lastCheckedAt: this.getLatestTimestamp(
        websitesView
          .filter((w) => Boolean(w.lastCheckedAt))
          .map((w) => ({ lastCheckedAt: w.lastCheckedAt as Date })),
      ),

      websites: websitesView,

      alerts: recentAlerts,

      ssl: {
        expiringCount: expiringCertificates.length,
      },

      monitoring: {
        active: true,
        message: 'All monitoring systems operational',
      },
    };
  }

  private resolveStatusMessage(status: string) {
    if (status === 'healthy') return 'All systems operational';
    if (status === 'monitoring') return 'Increased activity detected';
    return 'Attention required';
  }

  private resolveTrafficLabel(activeVisitors: number) {
    if (activeVisitors > 500) return 'high';
    if (activeVisitors > 200) return 'medium';
    return 'normal';
  }

  private getLatestTimestamp(
    websites: Array<{ lastCheckedAt: Date | string }>,
  ): Date {
    if (websites.length === 0) {
      return new Date(0);
    }

    let latestTimestamp = new Date(websites[0].lastCheckedAt).getTime();

    for (let i = 1; i < websites.length; i++) {
      const currentTimestamp = new Date(websites[i].lastCheckedAt).getTime();

      if (currentTimestamp > latestTimestamp) {
        latestTimestamp = currentTimestamp;
      }
    }

    return new Date(latestTimestamp);
  }
}
