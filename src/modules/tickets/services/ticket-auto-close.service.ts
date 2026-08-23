import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { TicketStatus } from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import type { AppConfigType } from '#/utils/config/app.config.js';

@Injectable()
export class TicketAutoCloseService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = createAppLogger(TicketAutoCloseService.name);
  private readonly cronJobName = 'ticket-auto-close-cycle';
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfigType, true>,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    const settings = this.getSettings();
    if (!settings.autoCloseEnabled) {
      this.logger.log('ticket.auto_close.disabled');
      return;
    }

    this.deleteCronJobSafely(this.cronJobName);

    const job = new CronJob(
      settings.autoCloseCronExpression,
      () => {
        // Swallow rejections so a failed cron cycle cannot crash the process.
        void this.runAutoClose('cron').catch(() => undefined);
      },
      null,
      false,
      'UTC',
    );

    this.schedulerRegistry.addCronJob(this.cronJobName, job);
    job.start();

    this.logger.log('ticket.auto_close.enabled', {
      cron: settings.autoCloseCronExpression,
      graceDays: settings.autoCloseGraceDays,
    });
  }

  onModuleDestroy(): void {
    this.deleteCronJobSafely(this.cronJobName);
  }

  async runAutoClose(trigger: 'cron' | 'manual' = 'manual'): Promise<number> {
    const settings = this.getSettings();
    if (!settings.autoCloseEnabled) {
      return 0;
    }

    if (this.isRunning) {
      this.logger.debug('ticket.auto_close.skipped_already_running', {
        trigger,
      });
      return 0;
    }

    this.isRunning = true;
    const startedAt = Date.now();

    try {
      const now = new Date();
      const result = await this.prisma.ticket.updateMany({
        where: {
          status: TicketStatus.RESOLVED,
          autoCloseAt: { lte: now },
        },
        data: {
          status: TicketStatus.CLOSED,
          autoCloseAt: null,
        },
      });

      this.logger.log('ticket.auto_close.completed', {
        trigger,
        closedCount: result.count,
        durationMs: Date.now() - startedAt,
      });

      return result.count;
    } catch (error) {
      this.logger.error('ticket.auto_close.failed', error as Error, {
        trigger,
      });
      // Manual callers can observe the rejection; cron must not tear down Nest.
      if (trigger === 'manual') {
        throw error;
      }
      return 0;
    } finally {
      this.isRunning = false;
    }
  }

  private getSettings() {
    return this.config.get('app', { infer: true }).tickets;
  }

  private deleteCronJobSafely(name: string): void {
    try {
      const job = this.schedulerRegistry.getCronJob(name);
      job.stop();
      this.schedulerRegistry.deleteCronJob(name);
    } catch {
      // Job may not exist yet.
    }
  }
}
