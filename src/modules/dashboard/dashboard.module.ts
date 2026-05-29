import { Module } from '@nestjs/common';

import { DashboardController } from './controllers/dashboard.controller.js';
import { DashboardService } from './services/dashboard.service.js';
import { MetricsOverviewService } from '../metrics/services/metrics-overview.service.js';
import { AlertsService } from '../alerts/services/alerts.service.js';
import { WebsitesService } from '../websites/services/websites.service.js';
import { SslCertificatesService } from '../ssl-certificates/services/ssl-certificates.service.js';
import { SystemHealthService } from '../health/services/system-health.service.js';
import { WebMetricsService } from '../metrics/services/web-metrics.service.js';
import { AlertsRepository } from '../alerts/repositories/alerts.repository.js';
import { WebMetricsRepository } from '../metrics/repositories/web-metrics.repository.js';

@Module({
  controllers: [DashboardController],
  providers: [
    DashboardService,
    MetricsOverviewService,
    AlertsService,
    WebsitesService,
    SslCertificatesService,
    SystemHealthService,
    WebMetricsService,
    AlertsRepository,
    WebMetricsRepository,
  ],
})
export class DashboardModule {}
