import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { RealtimeGateway } from './gateways/realtime.gateway.js';
import { RealtimeService } from './services/realtime.service.js';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { MetricsModule } from '../metrics/metrics.module.js';
import { HealthModule } from '../health/health.module.js';

@Module({
  imports: [DashboardModule, MetricsModule, HealthModule],
  providers: [RealtimeGateway, RealtimeService, JwtService],
})
export class RealtimeModule {}
