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
import { AtGuard } from './modules/auth/guards/at-guard.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { EventModule } from './modules/event/event.module.js';
import { AgentController } from './modules/agent/agent.controller.js';
import { AgentModule } from './modules/agent/agent.module.js';
import { WebsiteModule } from './modules/website/website.module';
import { MetricModule } from './modules/metric/metric.module';
import { WebsitesModule } from './modules/websites/websites.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { SslCertificatesModule } from './modules/ssl-certificates/ssl-certificates.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AlertModule } from './modules/alert/alert.module';
import { HealthModule } from './modules/health/health.module';

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
    WebsiteModule,
    MetricModule,
    WebsitesModule,
    MetricsModule,
    SslCertificatesModule,
    AlertsModule,
    DashboardModule,
    AlertModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        // transform: true,
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
