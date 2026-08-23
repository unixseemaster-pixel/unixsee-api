import { Module } from '@nestjs/common';

import { DashboardController } from './controllers/dashboard.controller.js';
import { DashboardChartsService } from './services/dashboard-charts.service.js';
import { DashboardOverviewSnapshotService } from './services/dashboard-overview-snapshot.service.js';
import { DashboardService } from './services/dashboard.service.js';
import { MetricsModule } from '../metrics/metrics.module.js';
import { AlertsModule } from '../alerts/alerts.module.js';
import { SslCertificatesModule } from '../ssl-certificates/ssl-certificates.module.js';
import { HealthModule } from '../health/health.module.js';

@Module({
  imports: [MetricsModule, AlertsModule, SslCertificatesModule, HealthModule],
  controllers: [DashboardController],
  providers: [
    DashboardChartsService,
    DashboardOverviewSnapshotService,
    DashboardService,
  ],
  exports: [
    DashboardService,
    DashboardChartsService,
    DashboardOverviewSnapshotService,
  ],
})
export class DashboardModule {}
