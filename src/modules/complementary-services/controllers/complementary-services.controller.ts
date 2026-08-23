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
import { ComplementaryServicesService } from '../services/complementary-services.service.js';

@Controller('v1/complementary-service-requests')
export class ComplementaryServicesController {
  constructor(
    private readonly complementaryServices: ComplementaryServicesService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.complementaryServices.listForUser(user.id, {
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id')
  async get(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    const data = await this.complementaryServices.getForUser(user.id, id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    const data = await this.complementaryServices.withdraw(user.id, id);
    return ApiResponseBuilder.ok(data);
  }
}
