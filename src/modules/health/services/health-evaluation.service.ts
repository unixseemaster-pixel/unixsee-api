import { Injectable } from '@nestjs/common';

import { AlertsService } from '#/modules/alerts/services/alerts.service.js';

// Evaluates incoming metrics and triggers/resolves alerts (write-side logic).
@Injectable()
export class HealthEvaluationService {
  constructor(private readonly alertsService: AlertsService) {}

  async evaluateWebsiteTraffic(input: {
    websiteId: string;
    concurrentRequests: number;
  }) {
    const isHighTraffic = input.concurrentRequests >= 200;

    if (isHighTraffic) {
      return this.alertsService.createHighTrafficAlert(input.websiteId);
    }

    return this.alertsService.resolveWebsiteAlerts(input.websiteId);
  }
}
