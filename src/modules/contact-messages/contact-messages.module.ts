import { Module } from '@nestjs/common';

import { StorageModule } from '#/modules/storage/storage.module.js';

import { AdminContactMessagesController } from './controllers/admin-contact-messages.controller.js';
import { PublicContactMessagesController } from './controllers/public-contact-messages.controller.js';
import { ContactMessagesService } from './services/contact-messages.service.js';

@Module({
  imports: [StorageModule],
  controllers: [
    PublicContactMessagesController,
    AdminContactMessagesController,
  ],
  providers: [ContactMessagesService],
  exports: [ContactMessagesService],
})
export class ContactMessagesModule {}
