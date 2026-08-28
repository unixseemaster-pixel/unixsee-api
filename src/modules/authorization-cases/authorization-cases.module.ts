import { Module } from '@nestjs/common';

import { AdminAuthorizationCasesController } from './controllers/admin-authorization-cases.controller.js';
import { AuthorizationCasesController } from './controllers/authorization-cases.controller.js';
import { AuthorizationCasesService } from './services/authorization-cases.service.js';
import { ComplementaryServicesModule } from '#/modules/complementary-services/complementary-services.module.js';
import { StorageModule } from '#/modules/storage/storage.module.js';

@Module({
  imports: [StorageModule, ComplementaryServicesModule],
  providers: [AuthorizationCasesService],
  controllers: [
    AuthorizationCasesController,
    AdminAuthorizationCasesController,
  ],
  exports: [AuthorizationCasesService],
})
export class AuthorizationCasesModule {}
