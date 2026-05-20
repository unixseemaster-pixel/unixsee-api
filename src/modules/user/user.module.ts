import { Module } from '@nestjs/common';

import { UserService } from './services/user/user.service.js';
import { UserController } from './controller/user/user.controller.js';

@Module({
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
