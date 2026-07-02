import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { EventModule } from '../event/event.module.js';
import { WebsiteUptimeProbeService } from './services/website-uptime-probe.service.js';

@Module({
  imports: [ScheduleModule.forRoot(), EventModule],
  providers: [WebsiteUptimeProbeService],
  exports: [WebsiteUptimeProbeService],
})
export class UptimeModule {}
