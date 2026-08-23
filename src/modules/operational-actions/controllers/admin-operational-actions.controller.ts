import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import {
  OperationalActionStatus,
  Role,
} from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { OperationalActionsService } from '../services/operational-actions.service.js';

@Controller('v1/admin/operational-actions')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminOperationalActionsController {
  constructor(
    private readonly operationalActionsService: OperationalActionsService,
  ) {}

  @Get()
  async list(
    @Query('status') status?: OperationalActionStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.operationalActionsService.listAdmin({
      status,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retry(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.operationalActionsService.retry(
      id,
      user.id,
      idempotencyKey,
    );
    return ApiResponseBuilder.ok(data);
  }
}
