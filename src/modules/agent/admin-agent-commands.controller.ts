import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Role } from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { AgentService } from './agent.service.js';

@Controller('v1/admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminAgentCommandsController {
  constructor(private readonly agentService: AgentService) {}

  @Post('discoveries/:id/stack-refresh')
  @HttpCode(HttpStatus.OK)
  async refreshDiscovery(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    const data = await this.agentService.requestDiscoveryStackRefresh(
      id,
      user.id,
    );
    return ApiResponseBuilder.ok(data);
  }

  @Post('websites/:id/stack-refresh')
  @HttpCode(HttpStatus.OK)
  async refreshWebsite(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    const data = await this.agentService.requestWebsiteStackRefresh(
      id,
      user.id,
    );
    return ApiResponseBuilder.ok(data);
  }

  @Get('agent-commands/:id')
  async getCommand(@Param('id') id: string) {
    const data = await this.agentService.getCommand(id);
    return ApiResponseBuilder.ok(data);
  }
}
