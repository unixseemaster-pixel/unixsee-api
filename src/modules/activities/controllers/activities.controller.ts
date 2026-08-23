import { Controller, Get, Query } from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { ActivitiesService } from '../services/activities.service.js';

@Controller('v1/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.activitiesService.listForUser(user.id, {
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }
}
