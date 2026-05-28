import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AgentSignatureGuard } from './guards/agent-signature.guard.js';
import { IngestAgentMetricsDto } from './dto/ingest-agent-metrics.dto.js';
import { AgentService } from './agent.service.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { IsFirstProvisioning } from './decorators/is-first-provisioning.js';

@Controller('internal/agent/v1')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Public()
  @Post('ingest')
  @UseGuards(AgentSignatureGuard)
  @HttpCode(HttpStatus.CREATED)
  async ingestAgentMetrics(
    @Ip() clientIp: string,
    @IsFirstProvisioning() isFirstProvisioningCycle: boolean,
    @Body() payload: IngestAgentMetricsDto,
  ) {
    console.log('request received.............');
    const result = await this.agentService.processTelemetryIngestion(
      payload,
      isFirstProvisioningCycle,
      clientIp,
    );

    return {
      status: 'success',
      ...(result.assignedSecretKey && {
        assignedSecretKey: result.assignedSecretKey,
      }),
    };
  }
}
