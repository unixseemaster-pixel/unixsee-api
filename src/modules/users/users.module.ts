import { Module } from '@nestjs/common';

import { UsersService } from './services/users.service.js';
import { UsersController } from './controllers/users.controller.js';
import { AdminUsersController } from './controllers/admin-users.controller.js';
import { OtpModule } from '#/modules/auth/otp.module.js';
import { MailModule } from '#/modules/mail/mail.module.js';
import { StorageModule } from '#/modules/storage/storage.module.js';
import { TenantsModule } from '#/modules/tenants/tenants.module.js';

@Module({
  imports: [OtpModule, MailModule, StorageModule, TenantsModule],
  providers: [UsersService],
  controllers: [UsersController, AdminUsersController],
  exports: [UsersService],
})
export class UsersModule {}
