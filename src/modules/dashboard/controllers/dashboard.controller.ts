import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { DashboardChartsService } from '../services/dashboard-charts.service.js';
import { DashboardService } from '../services/dashboard.service.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import type { CurrentUserType } from '#/@types/express/index.js';
import { MonitoringAccessGuard } from '#/modules/auth/guards/monitoring-access.guard.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';

import type {
  DashboardChartsInterval,
  DashboardChartsRange,
} from '../services/dashboard-charts.service.js';

@Controller('v1/dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dashboardChartsService: DashboardChartsService,
  ) {}

  @Get('overview')
  async getOverview(@CurrentUser() user: CurrentUserType) {
    const data = await this.dashboardService.getOverview(user.id);

    return ApiResponseBuilder.ok(data);
  }

  @Get('overview/charts')
  async getOverviewCharts(
    @CurrentUser() user: CurrentUserType,
    @Query('range') range?: DashboardChartsRange,
    @Query('interval') interval?: DashboardChartsInterval,
  ) {
    const data = await this.dashboardChartsService.getOverviewCharts(
      user.id,
      range,
      interval,
    );

    return ApiResponseBuilder.ok(data);
  }

  @Get('websites/:websiteId')
  async getWebsiteDetails(
    @CurrentUser() user: CurrentUserType,
    @Param('websiteId') websiteId: string,
  ) {
    const data = await this.dashboardService.getWebsiteDetails(
      user.id,
      websiteId,
    );

    return ApiResponseBuilder.ok(data);
  }

  @Get('websites/:websiteId/charts')
  async getWebsiteCharts(
    @CurrentUser() user: CurrentUserType,
    @Param('websiteId') websiteId: string,
    @Query('range') range?: DashboardChartsRange,
    @Query('interval') interval?: DashboardChartsInterval,
  ) {
    const data = await this.dashboardChartsService.getWebsiteCharts(
      user.id,
      websiteId,
      range,
      interval,
    );

    return ApiResponseBuilder.ok(data);
  }

  @Get('vps/:vpsNodeId/charts')
  async getVpsCharts(
    @CurrentUser() user: CurrentUserType,
    @Param('vpsNodeId') vpsNodeId: string,
    @Query('range') range?: DashboardChartsRange,
    @Query('interval') interval?: DashboardChartsInterval,
  ) {
    const data = await this.dashboardChartsService.getVpsCharts(
      user.id,
      vpsNodeId,
      range,
      interval,
    );

    return ApiResponseBuilder.ok(data);
  }

  @UseGuards(MonitoringAccessGuard)
  @Get('monitoring')
  async getMonitoring(@CurrentUser() user: CurrentUserType) {
    const data = await this.dashboardService.getMonitoring(user.id);

    return ApiResponseBuilder.ok(data);
  }
}
