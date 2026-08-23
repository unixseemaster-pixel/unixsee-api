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

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import type { Prisma } from '#/generated/prisma/client.js';
import { Role } from '#/generated/prisma/enums.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { CreatePlanDto, UpdatePlanDto } from '../dto/admin-plan.dto.js';
import { PlansService } from '../services/plans.service.js';

@Controller('v1/admin/plans')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async list(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.plansService.listAdmin({
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreatePlanDto) {
    const data = await this.plansService.create({
      ...body,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    });
    return ApiResponseBuilder.created(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdatePlanDto) {
    const data = await this.plansService.update(id, {
      ...body,
      metadata:
        body.metadata === null
          ? null
          : (body.metadata as Prisma.InputJsonValue | undefined),
    });
    return ApiResponseBuilder.ok(data);
  }
}
