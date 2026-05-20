import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { AuthenticationController } from './controllers/authentication.controller.js';
import { AuthenticationService } from './services/authentication.service.js';
import { UserService } from '../user/services/user/user.service.js';

@Module({
  imports: [
    JwtModule.register({
      // secret: jwtConstants.secret,
      // signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, UserService, JwtService],
})
export class AuthModule {}
