import { Controller, Get } from '@nestjs/common';
import { DashboardService } from '../services/dashboard.service.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import type { CurrentUserType } from '#/@types/express/index.js';

@Controller('v1/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // @Public()
  @Get('overview')
  async getOverview(@CurrentUser() user: CurrentUserType) {
    return this.dashboardService.getOverview(user.id);
  }
}
