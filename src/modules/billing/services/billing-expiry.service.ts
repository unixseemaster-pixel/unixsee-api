import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { createAppLogger } from '#/common/logging/app-logger.js';

import { BillingService } from './billing.service.js';

@Injectable()
export class BillingExpiryService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = createAppLogger(BillingExpiryService.name);
  private readonly cronJobName = 'billing-expiry-cycle';
  private isRunning = false;

  constructor(
    private readonly billing: BillingService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    this.deleteCronJobSafely(this.cronJobName);

    const job = new CronJob(
      '15 * * * *',
      () => {
        void this.runExpiry('cron').catch(() => undefined);
      },
      null,
      false,
      'UTC',
    );

    this.schedulerRegistry.addCronJob(this.cronJobName, job);
    job.start();

    this.logger.log('billing.expiry.enabled', { cron: '15 * * * *' });
  }

  onModuleDestroy(): void {
    this.deleteCronJobSafely(this.cronJobName);
  }

  async runExpiry(trigger: 'cron' | 'manual' = 'manual'): Promise<number> {
    if (this.isRunning) {
      this.logger.debug('billing.expiry.skipped_already_running', { trigger });
      return 0;
    }

    this.isRunning = true;
    try {
      const count = await this.billing.expireOverdue();
      this.logger.log('billing.expiry.completed', { trigger, count });
      return count;
    } finally {
      this.isRunning = false;
    }
  }

  private deleteCronJobSafely(name: string) {
    try {
      if (this.schedulerRegistry.doesExist('cron', name)) {
        this.schedulerRegistry.deleteCronJob(name);
      }
    } catch {
      // Job may not exist yet.
    }
  }
}
