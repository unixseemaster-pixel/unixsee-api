import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';

import appConfig from './utils/config/app.config.js';
import { validateEnv } from './utils/config/env.validation.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { TenantsModule } from './modules/tenants/tenants.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AtGuard } from './modules/auth/guards/at-guard.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { EventModule } from './modules/event/event.module.js';
import { AgentModule } from './modules/agent/agent.module.js';
import { WebsitesModule } from './modules/websites/websites.module.js';
import { MetricsModule } from './modules/metrics/metrics.module.js';
import { SslCertificatesModule } from './modules/ssl-certificates/ssl-certificates.module.js';
import { AlertsModule } from './modules/alerts/alerts.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { UptimeModule } from './modules/uptime/uptime.module.js';
import { TenancyModule } from './common/tenancy/tenancy.module.js';
import { IdempotencyModule } from './common/idempotency/idempotency.module.js';
import { RateLimitModule } from './common/rate-limit/rate-limit.module.js';
import { PlansModule } from './modules/plans/plans.module.js';
import { PlanRequestsModule } from './modules/plan-requests/plan-requests.module.js';
import { ComplementaryServicesModule } from './modules/complementary-services/complementary-services.module.js';
import { ServersModule } from './modules/servers/servers.module.js';
import { DiscoveriesModule } from './modules/discoveries/discoveries.module.js';
import { TicketsModule } from './modules/tickets/tickets.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { UnixseeMessagesModule } from './modules/unixsee-messages/unixsee-messages.module.js';
import { ActivitiesModule } from './modules/activities/activities.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AdminOverviewModule } from './modules/admin-overview/admin-overview.module.js';
import { OperationalActionsModule } from './modules/operational-actions/operational-actions.module.js';
import { AuthorizationCasesModule } from './modules/authorization-cases/authorization-cases.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { ContactMessagesModule } from './modules/contact-messages/contact-messages.module.js';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // dotenv-cli injects .env.development for start:dev; also load it here so
      // watch restarts and plain `nest start` still see mail/OTP SMTP settings.
      envFilePath: [
        '.env.development',
        '.env.staging',
        '.env.production',
        '.env',
      ],
      load: [appConfig],
      validate: validateEnv,
      expandVariables: true, // Supports ${VAR} interpolation in .env
      cache: true, // Cache config lookups for performance
    }),
    PrismaModule,
    TenancyModule,
    IdempotencyModule,
    RateLimitModule,
    AuthModule,
    UsersModule,
    TenantsModule,
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
    PlansModule,
    PlanRequestsModule,
    ComplementaryServicesModule,
    BillingModule,
    SubscriptionsModule,
    ContactMessagesModule,
    ServersModule,
    DiscoveriesModule,
    TicketsModule,
    NotificationsModule,
    UnixseeMessagesModule,
    ActivitiesModule,
    AuditModule,
    AdminOverviewModule,
    OperationalActionsModule,
    AuthorizationCasesModule,
    UploadsModule,
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
  ],
})
export class AppModule {}
