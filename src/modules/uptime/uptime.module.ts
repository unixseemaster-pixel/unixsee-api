import { Module } from '@nestjs/common';

import { EventModule } from '../event/event.module.js';
import { WebsiteUptimeProbeService } from './services/website-uptime-probe.service.js';

@Module({
  imports: [EventModule],
  providers: [WebsiteUptimeProbeService],
  exports: [WebsiteUptimeProbeService],
})
export class UptimeModule {}
