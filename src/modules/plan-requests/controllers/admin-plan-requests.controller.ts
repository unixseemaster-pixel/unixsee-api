import {
  Body,
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
import { PlanRequestStatus, Role } from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import {
  DeclinePlanRequestDto,
  EnablePlanRequestDto,
  LinkPlanRequestDto,
} from '../dto/plan-request.dto.js';
import { PlanRequestsService } from '../services/plan-requests.service.js';

@Controller('v1/admin/plan-requests')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminPlanRequestsController {
  constructor(private readonly planRequestsService: PlanRequestsService) {}

  @Get()
  async list(
    @Query('status') status?: PlanRequestStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.planRequestsService.listAdmin({
      status,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.planRequestsService.getAdmin(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/link')
  @HttpCode(HttpStatus.OK)
  async link(@Param('id') id: string, @Body() body: LinkPlanRequestDto) {
    const data = await this.planRequestsService.link(id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  async enable(
    @Param('id') id: string,
    @Body() body: EnablePlanRequestDto,
    @CurrentUser() user: CurrentUserType,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.planRequestsService.enable(
      id,
      user.id,
      body,
      idempotencyKey,
    );
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  async decline(@Param('id') id: string, @Body() body: DeclinePlanRequestDto) {
    const data = await this.planRequestsService.decline(id, body.reason);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/unlink')
  @HttpCode(HttpStatus.OK)
  async unlink(@Param('id') id: string) {
    const data = await this.planRequestsService.unlink(id);
    return ApiResponseBuilder.ok(data);
  }
}
