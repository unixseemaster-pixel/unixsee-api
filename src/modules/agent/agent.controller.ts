import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AgentSignatureGuard } from './guards/agent-signature.guard.js';
import { IngestAgentMetricsDto } from './dto/ingest-agent-metrics.dto.js';
import { AgentService } from './agent.service.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { IsFirstProvisioning } from './decorators/is-first-provisioning.js';

@Controller('internal/agent/v1')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

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
    const batchSize = payload.batch.length;
    const websiteEntryCount = payload.batch.reduce(
      (total, entry) => total + entry.websites.length,
      0,
    );
    const machineId = payload.batch[0]?.machineId ?? 'unknown';

    this.logger.log(
      `Agent ingest received | machine=${machineId} | batch=${batchSize} | websiteEntries=${websiteEntryCount} | firstProvisioning=${isFirstProvisioningCycle}`,
    );

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
