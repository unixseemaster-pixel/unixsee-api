import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';

import appConfig from './utils/config/app.config.js';
import { validateEnv } from './utils/config/env.validation.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AtGuard } from './modules/auth/guards/at-guard.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { EventModule } from './modules/event/event.module.js';
import { AgentController } from './modules/agent/agent.controller.js';
import { AgentModule } from './modules/agent/agent.module.js';
import { WebsitesModule } from './modules/websites/websites.module.js';
import { MetricsModule } from './modules/metrics/metrics.module.js';
import { SslCertificatesModule } from './modules/ssl-certificates/ssl-certificates.module.js';
import { AlertsModule } from './modules/alerts/alerts.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { UptimeModule } from './modules/uptime/uptime.module.js';

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
    RealtimeModule,
    EventModule,
    AgentModule,
    WebsitesModule,
    MetricsModule,
    SslCertificatesModule,
    AlertsModule,
    DashboardModule,
    HealthModule,
    UptimeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtService,

    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
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
