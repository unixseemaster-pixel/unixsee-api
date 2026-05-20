import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import appConfig from './utils/config/app.config.js';
import { validateEnv } from './utils/config/env.validation.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AtGuard } from './common/guards/at-guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
      expandVariables: true, // Supports ${VAR} interpolation in .env
      cache: true, // Cache config lookups for performance
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    JwtModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        // transform: true,
        // transformOptions: {
        //   enableImplicitConversion: true,
        // },
      }),
    },

    {
      provide: APP_GUARD,
      useClass: AtGuard,
    },
    // {
    //   provide: APP_GUARD,
    //   useClass: PermissionsGuard,
    // },
  ],
})
export class AppModule {}
