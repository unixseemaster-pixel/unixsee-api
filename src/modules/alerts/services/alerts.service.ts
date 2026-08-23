import { Injectable, NotFoundException } from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { TenantAccessService } from '#/common/tenancy/tenant-access.service.js';
import { AlertSeverity, AlertStatus } from '#/generated/prisma/enums.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import { AlertsRepository } from '../repositories/alerts.repository.js';

@Injectable()
export class AlertsService {
  private readonly logger = createAppLogger(AlertsService.name);

  constructor(
    private readonly alertsRepository: AlertsRepository,
    private readonly tenantAccess: TenantAccessService,
  ) {}

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

    const resolvedAlert = await this.alertsRepository.resolveAlert(
      activeAlert.id,
    );

    this.logger.log('alert.resolved', {
      websiteId,
      alertId: resolvedAlert.id,
    });

    return resolvedAlert;
  }

  /** @deprecated use getRecentAlertsForUser */
  getRecentAlerts(userId: string) {
    return this.getRecentAlertsForUser(userId);
  }

  async getRecentAlertsForUser(userId: string) {
    const tenantIds = await this.tenantAccess.getAccessibleTenantIds(userId);
    return this.alertsRepository.findRecentByTenantIds(tenantIds);
  }

  async listAdmin(params?: {
    status?: string;
    skip?: number;
    take?: number;
  }) {
    return this.alertsRepository.findAdmin(params);
  }

  async acknowledge(alertId: string) {
    const alert = await this.alertsRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const updated = await this.alertsRepository.updateStatus(
      alertId,
      AlertStatus.ACKNOWLEDGED,
      { acknowledgedAt: new Date() },
    );

    this.logger.log('alert.acknowledged', { alertId });
    return updated;
  }

  async resolveById(alertId: string) {
    const alert = await this.alertsRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const updated = await this.alertsRepository.resolveAlert(alertId);
    this.logger.log('alert.resolved', { alertId });
    return updated;
  }

  async suppress(alertId: string) {
    const alert = await this.alertsRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException(ERROR_MESSAGES.fa.notFound);
    }

    const updated = await this.alertsRepository.updateStatus(
      alertId,
      AlertStatus.SUPPRESSED,
      { suppressedAt: new Date() },
    );

    this.logger.log('alert.suppressed', { alertId });
    return updated;
  }
}
