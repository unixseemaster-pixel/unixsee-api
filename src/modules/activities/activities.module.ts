import { Module } from '@nestjs/common';

import { ActivitiesController } from './controllers/activities.controller.js';
import { AdminActivitiesController } from './controllers/admin-activities.controller.js';
import { ActivitiesService } from './services/activities.service.js';

@Module({
  providers: [ActivitiesService],
  controllers: [ActivitiesController, AdminActivitiesController],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
