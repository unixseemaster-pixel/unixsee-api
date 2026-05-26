import { Module } from '@nestjs/common';

import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import { AgentSignatureGuard } from './guards/agent-signature.guard.js';
import { PrismaService } from '../prisma/services/prisma.service.js';
import { EventModule } from '../event/event.module.js';
import { EventDispatcherService } from '../event/event-dispatcher.service.js';

@Module({
  imports: [EventModule],
  controllers: [AgentController],
  providers: [AgentService, AgentSignatureGuard, PrismaService],
})
export class AgentModule {}
