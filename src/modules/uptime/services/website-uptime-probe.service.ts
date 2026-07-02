import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { EventDispatcherService } from '#/modules/event/event-dispatcher.service.js';
import { WebsiteProbeSource } from '#/generated/prisma/enums.js';
import type { AppConfigType } from '#/utils/config/app.config.js';

type WebsiteProbeTarget = {
  id: string;
  domain: string;
};

type ProbeResult = {
  isUp: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  ttfbMs: number | null;
  errorMessage: string | null;
};

type UptimeProbeSettings = AppConfigType['app']['uptimeProbes'];

@Injectable()
export class WebsiteUptimeProbeService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(WebsiteUptimeProbeService.name);
  private readonly cronJobName = 'public-uptime-probe-cycle';
  private readonly startupJobName = 'public-uptime-probe-startup';
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventDispatcher: EventDispatcherService,
    private readonly config: ConfigService<AppConfigType, true>,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    const settings = this.getSettings();

    if (!settings.enabled) {
      this.logger.log('Public website uptime probes are disabled.');
      return;
    }

    this.registerRecurringProbeJob(settings);
    this.registerStartupProbeJob(settings);

    this.logger.log(
      `Public website uptime probes enabled | cron=${settings.cronExpression} | startupDelayMs=${settings.startupDelayMs} | timeoutMs=${settings.timeoutMs} | concurrency=${settings.concurrency} | source=${WebsiteProbeSource.BACKEND}`,
    );
  }

  onModuleDestroy(): void {
    this.deleteCronJobSafely(this.startupJobName);
    this.deleteCronJobSafely(this.cronJobName);
  }

  async probeAllActiveWebsites(
    trigger: 'cron' | 'startup' | 'manual' = 'manual',
  ): Promise<{
    checked: number;
    up: number;
    down: number;
  }> {
    const settings = this.getSettings();

    if (!settings.enabled) {
      return { checked: 0, up: 0, down: 0 };
    }

    if (this.isRunning) {
      this.logger.debug(
        `Skipping uptime probe cycle because previous cycle is still running | trigger=${trigger}`,
      );
      return { checked: 0, up: 0, down: 0 };
    }

    this.isRunning = true;
    const startedAt = Date.now();

    try {
      const targets = await this.prisma.website.findMany({
        where: { isActive: true },
        orderBy: { domain: 'asc' },
        take: settings.batchSize,
        select: {
          id: true,
          domain: true,
        },
      });

      const results = await this.mapWithConcurrency(
        targets,
        settings.concurrency,
        (target) => this.probeAndPersist(target, settings),
      );

      const checked = results.length;
      const up = results.filter((result) => result.isUp).length;
      const down = checked - up;

      this.logger.log(
        `Public uptime probe cycle completed | trigger=${trigger} | checked=${checked} | up=${up} | down=${down} | durationMs=${Date.now() - startedAt}`,
      );

      return { checked, up, down };
    } finally {
      this.isRunning = false;
    }
  }

  private registerRecurringProbeJob(settings: UptimeProbeSettings): void {
    this.deleteCronJobSafely(this.cronJobName);

    const job = new CronJob(
      settings.cronExpression,
      () => this.runProbeCycle('cron'),
      null,
      false,
      'UTC',
    );

    this.schedulerRegistry.addCronJob(this.cronJobName, job);
    job.start();
  }

  private registerStartupProbeJob(settings: UptimeProbeSettings): void {
    this.deleteCronJobSafely(this.startupJobName);

    if (settings.startupDelayMs <= 0) {
      this.runProbeCycle('startup');
      return;
    }

    const runAt = new Date(Date.now() + settings.startupDelayMs);
    const job = new CronJob(
      runAt,
      () => {
        this.runProbeCycle('startup');
        this.deleteCronJobSafely(this.startupJobName);
      },
      null,
      false,
      'UTC',
    );

    this.schedulerRegistry.addCronJob(this.startupJobName, job);
    job.start();
  }

  private runProbeCycle(trigger: 'cron' | 'startup'): void {
    this.probeAllActiveWebsites(trigger).catch((error) => {
      this.logger.error(
        `Uptime probe cycle failed | trigger=${trigger} | ${this.formatError(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  private deleteCronJobSafely(name: string): void {
    try {
      const job = this.schedulerRegistry.getCronJob(name);
      job.stop();
      this.schedulerRegistry.deleteCronJob(name);
    } catch {
      // No-op: Nest SchedulerRegistry throws if the job does not exist.
    }
  }

  private async probeAndPersist(
    target: WebsiteProbeTarget,
    settings: UptimeProbeSettings,
  ): Promise<ProbeResult> {
    const requestedRecordedAt = new Date();
    const result = await this.probeWebsite(target.domain, settings);
    const persistedRecordedAt = await this.persistProbeMetric(
      target,
      requestedRecordedAt,
      result,
    );

    await this.prisma.website.update({
      where: { id: target.id },
      data: {
        lastIsUp: result.isUp,
        lastStatusCode: result.statusCode,
        lastResponseTimeMs: result.responseTimeMs,
        lastProbeAt: persistedRecordedAt,
      },
    });

    this.eventDispatcher.dispatchWebsiteProbeEvaluated({
      websiteId: target.id,
      domain: target.domain,
      probeSource: WebsiteProbeSource.BACKEND,
      availability: {
        isUp: result.isUp,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        ttfbMs: result.ttfbMs,
        errorMessage: result.errorMessage,
        lastProbeAt: persistedRecordedAt.toISOString(),
      },
      timestamp: persistedRecordedAt.toISOString(),
    });

    return result;
  }

  private async persistProbeMetric(
    target: WebsiteProbeTarget,
    requestedRecordedAt: Date,
    result: ProbeResult,
  ): Promise<Date> {
    let recordedAt = new Date(requestedRecordedAt);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        await this.prisma.websiteProbeMetric.create({
          data: {
            recordedAt,
            websiteId: target.id,
            probeSource: WebsiteProbeSource.BACKEND,
            isUp: result.isUp,
            statusCode: result.statusCode,
            responseTimeMs: result.responseTimeMs,
            ttfbMs: result.ttfbMs,
            errorMessage: result.errorMessage,
          },
        });

        return recordedAt;
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }

        recordedAt = new Date(recordedAt.getTime() + 1);
      }
    }

    throw new Error(
      `Could not persist public probe metric after timestamp collision retries for website ${target.domain}`,
    );
  }

  private async probeWebsite(
    domain: string,
    settings: UptimeProbeSettings,
  ): Promise<ProbeResult> {
    const normalizedDomain = this.normalizeDomain(domain);
    const httpsResult = await this.probeUrl(
      new URL(`https://${normalizedDomain}/`),
      settings,
    );

    if (httpsResult.isUp || !settings.allowHttpFallback) {
      return httpsResult;
    }

    const httpResult = await this.probeUrl(
      new URL(`http://${normalizedDomain}/`),
      settings,
    );

    return httpResult.isUp ? httpResult : httpsResult;
  }

  private probeUrl(
    url: URL,
    settings: UptimeProbeSettings,
  ): Promise<ProbeResult> {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      let settled = false;
      let ttfbMs: number | null = null;
      const client = url.protocol === 'https:' ? https : http;

      const finish = (result: ProbeResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const request = client.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method: 'GET',
          timeout: settings.timeoutMs,
          servername: url.hostname,
          headers: {
            'User-Agent': settings.userAgent,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            Connection: 'close',
          },
        },
        (response) => {
          ttfbMs = Date.now() - startedAt;
          const statusCode = response.statusCode ?? null;
          const isAccepted = statusCode
            ? this.isAcceptedStatusCode(statusCode, settings)
            : false;
          let completed = false;

          const complete = () => {
            if (completed) return;
            completed = true;
            finish({
              isUp: isAccepted,
              statusCode,
              responseTimeMs: Date.now() - startedAt,
              ttfbMs,
              errorMessage: isAccepted
                ? null
                : statusCode
                  ? `HTTP ${statusCode}`
                  : 'No HTTP status code returned',
            });
          };

          response.once('data', () => complete());
          response.once('end', () => complete());
          response.once('error', (error) => {
            finish({
              isUp: false,
              statusCode,
              responseTimeMs: Date.now() - startedAt,
              ttfbMs,
              errorMessage: this.normalizeErrorMessage(error),
            });
          });
          response.resume();
        },
      );

      request.once('timeout', () => {
        request.destroy(
          new Error(`Probe timed out after ${settings.timeoutMs}ms`),
        );
      });

      request.once('error', (error) => {
        finish({
          isUp: false,
          statusCode: null,
          responseTimeMs: Date.now() - startedAt,
          ttfbMs,
          errorMessage: this.normalizeErrorMessage(error),
        });
      });

      request.end();
    });
  }

  private getSettings(): UptimeProbeSettings {
    return this.config.get('app', { infer: true }).uptimeProbes;
  }

  private isAcceptedStatusCode(
    statusCode: number,
    settings: UptimeProbeSettings,
  ): boolean {
    return settings.acceptedStatusCodeRanges.some(
      (range) => statusCode >= range.from && statusCode <= range.to,
    );
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private normalizeDomain(domain: string): string {
    const trimmed = domain.trim().replace(/^https?:\/\//i, '').split('/')[0];
    return trimmed.replace(/\.$/, '');
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];
    let cursor = 0;

    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (cursor < items.length) {
          const currentIndex = cursor;
          cursor += 1;
          results[currentIndex] = await mapper(items[currentIndex]);
        }
      },
    );

    await Promise.all(workers);
    return results;
  }

  private normalizeErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) return String(error).slice(0, 240);

    if (error.message.includes('timed out')) {
      return error.message.slice(0, 240);
    }

    const code = (error as NodeJS.ErrnoException).code;
    return (code ? `${code}: ${error.message}` : error.message).slice(0, 240);
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return String(error);
  }
}
