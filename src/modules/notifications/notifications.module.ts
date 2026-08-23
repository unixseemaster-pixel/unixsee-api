import { Module } from '@nestjs/common';

import { AdminNotificationsController } from './controllers/admin-notifications.controller.js';
import { NotificationsController } from './controllers/notifications.controller.js';
import { NotificationsService } from './services/notifications.service.js';

@Module({
  providers: [NotificationsService],
  controllers: [NotificationsController, AdminNotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
