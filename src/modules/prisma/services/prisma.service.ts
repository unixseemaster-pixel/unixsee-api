import { PrismaClient } from '#/generated/prisma/client.js';
import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { createAppLogger } from '#/common/logging/app-logger.js';

/** Nest Prisma adapter; regenerate client after schema changes so delegates stay typed. */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = createAppLogger(PrismaService.name);
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('db.connected');
    } catch (error) {
      this.logger.error('db.connect_failed', error as Error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('db.disconnected');
  }
}
