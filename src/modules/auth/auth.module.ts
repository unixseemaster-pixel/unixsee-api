import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthenticationController } from './controllers/auth.service';
import { AuthService } from './services/auth.service';

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
