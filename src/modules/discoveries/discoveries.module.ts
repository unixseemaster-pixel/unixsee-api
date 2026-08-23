import { Module } from '@nestjs/common';

import { AdminDiscoveriesController } from './controllers/admin-discoveries.controller.js';
import { DiscoveriesService } from './services/discoveries.service.js';

@Module({
  providers: [DiscoveriesService],
  controllers: [AdminDiscoveriesController],
  exports: [DiscoveriesService],
})
export class DiscoveriesModule {}
