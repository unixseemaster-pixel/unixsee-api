import { Injectable } from '@nestjs/common';

import { AlertsService } from '#/modules/alerts/services/alerts.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

// Evaluates incoming metrics and triggers/resolves alerts (write-side logic).
@Injectable()
export class HealthEvaluationService {
  private readonly logger = createAppLogger(HealthEvaluationService.name);

  constructor(private readonly alertsService: AlertsService) {}

  async evaluateWebsiteTraffic(input: {
    websiteId: string;
    concurrentRequests: number;
  }) {
    const isHighTraffic = input.concurrentRequests >= 200;

    if (isHighTraffic) {
      this.logger.log('health.website_traffic.threshold_breached', {
        websiteId: input.websiteId,
        concurrentRequests: input.concurrentRequests,
      });
      return this.alertsService.createHighTrafficAlert(input.websiteId);
    }

    this.logger.debug('health.website_traffic.threshold_clear', {
      websiteId: input.websiteId,
      concurrentRequests: input.concurrentRequests,
    });
    return this.alertsService.resolveWebsiteAlerts(input.websiteId);
  }
}
