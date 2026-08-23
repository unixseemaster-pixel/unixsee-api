import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AgentSignatureGuard } from './guards/agent-signature.guard.js';
import {
  AgentCommandResultDto,
  EnrollAgentDto,
  HeartbeatAgentDto,
  Phase1IngestDto,
} from './dto/agent.dto.js';
import { AgentService } from './agent.service.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Controller('internal/agent/v1')
export class AgentController {
  private readonly logger = createAppLogger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  @Public()
  @Post('enroll')
  @HttpCode(HttpStatus.CREATED)
  async enroll(
    @Headers('x-enrollment-token')
    enrollmentToken: string | string[] | undefined,
    @Body() body: EnrollAgentDto,
  ) {
    const token = Array.isArray(enrollmentToken)
      ? enrollmentToken[0]
      : enrollmentToken;
    if (!token) {
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const result = await this.agentService.enroll(
      token,
      body.agentInstanceId,
      body.agentVersion,
    );

    this.logger.log('agent.enroll.completed', {
      agentInstanceId: body.agentInstanceId,
      vpsNodeId: result.vpsNodeId,
      serverId: result.serverId,
    });

    return ApiResponseBuilder.created(result);
  }

  @Public()
  @Post('heartbeat')
  @UseGuards(AgentSignatureGuard)
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Body() body: HeartbeatAgentDto) {
    return ApiResponseBuilder.ok(await this.agentService.heartbeat(body));
  }

  @Public()
  @Post('ingest')
  @UseGuards(AgentSignatureGuard)
  @HttpCode(HttpStatus.CREATED)
  async ingest(@Body() payload: Phase1IngestDto) {
    this.logger.debug('agent.ingest.received', {
      agentInstanceId: payload.agentInstanceId,
      discoveryCount: payload.discoveries?.length ?? 0,
      stackCount: payload.siteStacks?.length ?? 0,
      activeVisitorCount: payload.activeVisitors3m?.length ?? 0,
      visitors24hCount: payload.visitors24h?.length ?? 0,
    });
    return ApiResponseBuilder.created(
      await this.agentService.processPhase1Ingest(payload),
    );
  }

  @Public()
  @Post('commands/:id/result')
  @UseGuards(AgentSignatureGuard)
  @HttpCode(HttpStatus.OK)
  async commandResult(
    @Param('id') id: string,
    @Body() body: AgentCommandResultDto,
  ) {
    return ApiResponseBuilder.ok(
      await this.agentService.submitCommandResult(id, body),
    );
  }
}
