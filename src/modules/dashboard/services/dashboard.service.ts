import { AlertsService } from '#/modules/alerts/services/alerts.service.js';
import { MetricsOverviewService } from '#/modules/metrics/services/metrics-overview.service.js';
import { SslCertificatesService } from '#/modules/ssl-certificates/services/ssl-certificates.service.js';
import { WebsitesService } from '#/modules/websites/services/websites.service.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  constructor(
    private readonly metricsOverviewService: MetricsOverviewService,
    private readonly alertsService: AlertsService,
    private readonly websitesService: WebsitesService,
    private readonly sslCertificatesService: SslCertificatesService,
  ) {}

  async getOverview(userId: string) {
    const [metrics, recentAlerts, websites, expiringCertificates] =
      await Promise.all([
        this.metricsOverviewService.getOverview(userId),
        this.alertsService.getRecentAlerts(userId),
        this.websitesService.getUserWebsites(userId),
        this.sslCertificatesService.getExpiringCertificates(userId),
      ]);

    return {
      status: metrics.status,

      message: this.resolveStatusMessage(metrics.status),

      lastCheckedAt: new Date(),

      uptime: metrics.uptime,

      traffic: {
        activeVisitors: metrics.activeVisitors,
        status: this.resolveTrafficLabel(metrics.activeVisitors),
      },

      resources: {
        status: this.resolveResourceLabel(metrics.activeVisitors),
      },

      websites,

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

  private resolveResourceLabel(activeVisitors: number) {
    if (activeVisitors > 500) return 'warning';
    return 'normal';
  }
}
