import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SiteMonitoringGateway } from './gateways/site-monitoring.gateway.js';
import { SiteMonitoringService } from './services/site-monitoring.service.js';

@Module({
  providers: [SiteMonitoringGateway, SiteMonitoringService, JwtService],
})
export class SiteMonitoringModule {}
