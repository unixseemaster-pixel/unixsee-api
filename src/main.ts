import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/http/filters/global-exception.filter.js';
import type { AppConfigType } from './utils/config/app.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<AppConfigType>>(ConfigService);
  const allowedOrigins = configService.getOrThrow('app.corsAllowedOrigins', {
    infer: true,
  });

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

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
