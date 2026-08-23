import { Controller, Get, UseGuards } from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Role } from '#/generated/prisma/enums.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { AdminOverviewService } from '../services/admin-overview.service.js';

@Controller('v1/admin/overview')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminOverviewController {
  constructor(private readonly adminOverviewService: AdminOverviewService) {}

  @Get()
  async get() {
    const data = await this.adminOverviewService.getOverview();
    return ApiResponseBuilder.ok(data);
  }
}
