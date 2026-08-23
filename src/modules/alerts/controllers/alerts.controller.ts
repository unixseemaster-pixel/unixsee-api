import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { AlertsService } from '../services/alerts.service.js';

@Controller()
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('v1/alerts')
  async listForCustomer(@CurrentUser() user: CurrentUserType) {
    const data = await this.alertsService.getRecentAlertsForUser(user.id);
    return ApiResponseBuilder.ok(data);
  }

  @Get('v1/admin/alerts')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async listAdmin(
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.alertsService.listAdmin({
      status,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post('v1/admin/alerts/:id/ack')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  @HttpCode(HttpStatus.OK)
  async acknowledge(@Param('id') id: string) {
    const data = await this.alertsService.acknowledge(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post('v1/admin/alerts/:id/resolve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  @HttpCode(HttpStatus.OK)
  async resolve(@Param('id') id: string) {
    const data = await this.alertsService.resolveById(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post('v1/admin/alerts/:id/suppress')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  @HttpCode(HttpStatus.OK)
  async suppress(@Param('id') id: string, @Body() _body?: unknown) {
    const data = await this.alertsService.suppress(id);
    return ApiResponseBuilder.ok(data);
  }
}
