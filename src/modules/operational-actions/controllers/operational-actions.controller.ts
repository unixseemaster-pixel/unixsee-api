import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { CreateOperationalActionDto } from '../dto/operational-actions.dto.js';
import { OperationalActionsService } from '../services/operational-actions.service.js';

@Controller('v1/websites/:id/actions')
export class OperationalActionsController {
  constructor(
    private readonly operationalActionsService: OperationalActionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserType,
    @Param('id') websiteId: string,
    @Body() body: CreateOperationalActionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.operationalActionsService.createForWebsite(
      user.id,
      websiteId,
      body,
      idempotencyKey,
    );
    return ApiResponseBuilder.created(data);
  }

  @Get(':actionId')
  async get(
    @CurrentUser() user: CurrentUserType,
    @Param('id') websiteId: string,
    @Param('actionId') actionId: string,
  ) {
    const data = await this.operationalActionsService.getForWebsite(
      user.id,
      websiteId,
      actionId,
    );
    return ApiResponseBuilder.ok(data);
  }
}
