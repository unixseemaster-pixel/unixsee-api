import { Module } from '@nestjs/common';

import { AdminOperationalActionsController } from './controllers/admin-operational-actions.controller.js';
import { OperationalActionsController } from './controllers/operational-actions.controller.js';
import { OperationalActionsService } from './services/operational-actions.service.js';

@Module({
  providers: [OperationalActionsService],
  controllers: [
    OperationalActionsController,
    AdminOperationalActionsController,
  ],
  exports: [OperationalActionsService],
})
export class OperationalActionsModule {}
