import { Module } from '@nestjs/common';

import { StorageService } from './storage.service.js';
import { LocalStorageController } from './controllers/local-storage.controller.js';

@Module({
  controllers: [LocalStorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
