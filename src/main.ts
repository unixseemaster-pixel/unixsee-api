import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Ensure NestJS correctly reads the forwarded headers (X-Forwarded-For) to read VPS IPs
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  // app.enableCors({
  //   origin: ['http://localhost:3000'],
  //   credentials: true,
  // });

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
