import { Module } from '@nestjs/common';

import { StorageModule } from '#/modules/storage/storage.module.js';

import { AdminTicketsController } from './controllers/admin-tickets.controller.js';
import { TicketsController } from './controllers/tickets.controller.js';
import { TicketAutoCloseService } from './services/ticket-auto-close.service.js';
import { TicketNumberService } from './services/ticket-number.service.js';
import { TicketsService } from './services/tickets.service.js';

@Module({
  imports: [StorageModule],
  providers: [TicketsService, TicketNumberService, TicketAutoCloseService],
  controllers: [TicketsController, AdminTicketsController],
  exports: [TicketsService],
})
export class TicketsModule {}
