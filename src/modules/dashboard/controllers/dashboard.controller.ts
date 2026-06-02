import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import type { CurrentUserType } from '#/@types/express/index.js';
import { MonitoringAccessGuard } from '#/modules/auth/guards/monitoring-access.guard.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';

@Controller('v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  async getOverview(@CurrentUser() user: CurrentUserType) {
    const data = await this.dashboardService.getOverview(user.id);

    return ApiResponseBuilder.ok(data);
  }

  @UseGuards(MonitoringAccessGuard)
  @Get('monitoring')
  async getMonitoring(@CurrentUser() user: CurrentUserType) {
    const data = await this.dashboardService.getMonitoring(user.id);

    return ApiResponseBuilder.ok(data);
  }
}
