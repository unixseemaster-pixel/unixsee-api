import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { AuthenticationController } from './controllers/authentication.controller.js';
import { AuthenticationService } from './services/authentication.service.js';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy.js';
import { AccessTokenStrategy } from './strategies/access-token.strategy.js';
import { OtpModule } from './otp.module.js';
import { MonitoringAccessStrategy } from './strategies/monitoring-access.strategy.js';
import { UsersModule } from '#/modules/users/users.module.js';
import { TenantsModule } from '#/modules/tenants/tenants.module.js';
import { MailModule } from '#/modules/mail/mail.module.js';

@Module({
  imports: [
    UsersModule,
    TenantsModule,
    MailModule,
    OtpModule,
    JwtModule.register({
      // secret: jwtConstants.secret,
      // signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    JwtService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    MonitoringAccessStrategy,
  ],
})
export class AuthModule {}
