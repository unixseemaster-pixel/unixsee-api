import { Injectable } from '@nestjs/common';

import { AlertsRepository } from '../repositories/alerts.repository.js';
import { AlertSeverity } from '#/generated/prisma/enums.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class AlertsService {
  private readonly logger = createAppLogger(AlertsService.name);

  constructor(private readonly alertsRepository: AlertsRepository) {}

  async createHighTrafficAlert(websiteId: string) {
    const activeAlert =
      await this.alertsRepository.findActiveByWebsiteId(websiteId);

    if (activeAlert) {
      this.logger.debug('alert.high_traffic.already_active', {
        websiteId,
        alertId: activeAlert.id,
      });
      return activeAlert;
    }

    const alert = await this.alertsRepository.create({
      websiteId,

      title: 'High traffic detected',

      message:
        'Your website is receiving increased traffic and our monitoring systems are observing performance.',

      severity: AlertSeverity.WARNING,
    });

    this.logger.log('alert.high_traffic.created', {
      websiteId,
      alertId: alert.id,
      severity: alert.severity,
    });

    return alert;
  }

  async resolveWebsiteAlerts(websiteId: string) {
    const activeAlert =
      await this.alertsRepository.findActiveByWebsiteId(websiteId);

    if (!activeAlert) {
      this.logger.debug('alert.resolve.skipped_no_active_alert', { websiteId });
      return null;
    }

    const resolvedAlert = await this.alertsRepository.resolveAlert(activeAlert.id);

    this.logger.log('alert.resolved', {
      websiteId,
      alertId: resolvedAlert.id,
    });

    return resolvedAlert;
  }

  getRecentAlerts(userId: string) {
    return this.alertsRepository.findRecentByUserId(userId);
  }
}
