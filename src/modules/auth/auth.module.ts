import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { AuthenticationController } from './controllers/authentication.controller.js';
import { AuthenticationService } from './services/authentication.service.js';
import { UserService } from '../user/services/user/user.service.js';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy.js';
import { AccessTokenStrategy } from './strategies/access-token.strategy.js';
import { OtpService } from './services/otp-service.js';
import { MonitoringAccessStrategy } from './strategies/monitoring-access.strategy.js';

@Module({
  imports: [
    JwtModule.register({
      // secret: jwtConstants.secret,
      // signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    UserService,
    JwtService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    MonitoringAccessStrategy,
    OtpService,
  ],
})
export class AuthModule {}
