import { Module } from '@nestjs/common';

import { PublicUploadsController } from './controllers/public-uploads.controller.js';
import { StorageModule } from '#/modules/storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [PublicUploadsController],
})
export class UploadsModule {}
