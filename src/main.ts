import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/http/filters/global-exception.filter.js';
import { requestContextMiddleware } from './common/logging/request-context.middleware.js';
import { getLoggerLevels } from './common/logging/logger-levels.js';
import { createAppLogger } from './common/logging/app-logger.js';
import type { AppConfigType } from './utils/config/app.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: getLoggerLevels(process.env.APP_ENV, process.env.NODE_ENV),
    rawBody: true,
  });
  const configService = app.get<ConfigService<AppConfigType>>(ConfigService);
  const allowedOrigins = configService.getOrThrow('app.corsAllowedOrigins', {
    infer: true,
  });

  app.use(requestContextMiddleware);

  // Ensure NestJS correctly reads the forwarded headers (X-Forwarded-For) to read VPS IPs
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api');

  const port = configService.getOrThrow('app.port', { infer: true });
  await app.listen(port);

  createAppLogger('Bootstrap').log('app.started', {
    port,
    appEnv: configService.getOrThrow('app.appEnv', { infer: true }),
    nodeEnv: configService.getOrThrow('app.nodeEnv', { infer: true }),
  });
}

bootstrap();
