import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Role } from '#/generated/prisma/enums.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { ActivitiesService } from '../services/activities.service.js';

@Controller('v1/admin/activities')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  async list(
    @Query('tenantId') tenantId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.activitiesService.listAdmin({
      tenantId,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }
}
