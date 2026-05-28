import { Injectable } from '@nestjs/common';

import { AlertsRepository } from '../repositories/alerts.repository.js';
import { AlertSeverity } from '#/generated/prisma/enums.js';

@Injectable()
export class AlertsService {
  constructor(private readonly alertsRepository: AlertsRepository) {}

  async createHighTrafficAlert(websiteId: string) {
    const activeAlert =
      await this.alertsRepository.findActiveByWebsiteId(websiteId);

    if (activeAlert) {
      return activeAlert;
    }

    return this.alertsRepository.create({
      websiteId,

      title: 'High traffic detected',

      message:
        'Your website is receiving increased traffic and our monitoring systems are observing performance.',

      severity: AlertSeverity.WARNING,
    });
  }

  async resolveWebsiteAlerts(websiteId: string) {
    const activeAlert =
      await this.alertsRepository.findActiveByWebsiteId(websiteId);

    if (!activeAlert) {
      return null;
    }

    return this.alertsRepository.resolveAlert(activeAlert.id);
  }

  getRecentAlerts(userId: string) {
    return this.alertsRepository.findRecentByUserId(userId);
  }
}
