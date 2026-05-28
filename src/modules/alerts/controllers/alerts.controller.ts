import { Controller, Get } from '@nestjs/common';

import { AlertsService } from '../services/alerts.service.js';

@Controller('dashboard/incidents')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('recent')
  getRecentAlerts() {
    const userId = 'USER_ID';

    return this.alertsService.getRecentAlerts(userId);
  }
}
