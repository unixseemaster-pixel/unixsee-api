import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RealtimeGateway } from './gateways/realtime.gateway.js';
import { RealtimeService } from './services/realtime.service.js';
import { SystemHealthService } from '../health/services/system-health.service.js';
import { TrafficLoadService } from '../metrics/services/traffic-load.service.js';
import { DashboardOverviewSnapshotService } from '../dashboard/services/dashboard-overview-snapshot.service.js';
import { DashboardService } from '../dashboard/services/dashboard.service.js';

@Module({
  providers: [
    RealtimeGateway,
    RealtimeService,
    DashboardOverviewSnapshotService,
    DashboardService,
    JwtService,
    SystemHealthService,
    TrafficLoadService,
  ],
})
export class RealtimeModule {}
