import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Role } from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from '../dto/notifications.dto.js';
import { NotificationsService } from '../services/notifications.service.js';

@Controller('v1/admin/notifications')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.notificationsService.listAdmin({
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() body: CreateNotificationDto,
  ) {
    const data = await this.notificationsService.create(user.id, body);
    return ApiResponseBuilder.created(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateNotificationDto) {
    const data = await this.notificationsService.update(id, body);
    return ApiResponseBuilder.ok(data);
  }
}
