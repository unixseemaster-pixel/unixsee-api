import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthenticationController } from './controllers/auth.service.js';
import { AuthService } from './services/auth.service.js';

@Module({
  imports: [
    JwtModule.register({
      // secret: jwtConstants.secret,
      // signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [AuthService],
})
export class AuthModule {}
