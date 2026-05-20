import { Module } from '@nestjs/common';

import { PrismaService } from './services/prisma.service.js';

@Module({
  exports: [PrismaService],
  providers: [PrismaService],
})
export class PrismaModule {}
