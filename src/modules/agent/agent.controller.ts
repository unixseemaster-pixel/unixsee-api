import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/services/prisma.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AgentSignatureGuard } from './guards/agent-signature.guard.js';
import { IngestAgentMetricsDto } from './dto/ingest-agent-metrics.dto.js';
import { AgentService } from './agent.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('api/v1/agent')
export class AgentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly agentService: AgentService,
  ) {}

  @Public()
  @Post('ingest')
  @UseGuards(AgentSignatureGuard)
  @HttpCode(HttpStatus.CREATED)
  async ingestAgentMetrics(@Body() payload: IngestAgentMetricsDto) {
    await this.agentService.processTelemetryIngestion(payload);
    return { status: 'success' };
  }
}
