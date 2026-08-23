import { Module } from '@nestjs/common';

import { AdminServersController } from './controllers/admin-servers.controller.js';
import { ServersService } from './services/servers.service.js';

@Module({
  providers: [ServersService],
  controllers: [AdminServersController],
  exports: [ServersService],
})
export class ServersModule {}
