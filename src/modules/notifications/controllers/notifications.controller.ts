import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { NotificationsService } from '../services/notifications.service.js';

@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.notificationsService.listForUser(user.id, {
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    const data = await this.notificationsService.markRead(user.id, id);
    return ApiResponseBuilder.ok(data);
  }
}
