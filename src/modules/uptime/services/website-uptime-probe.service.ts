import dns from 'node:dns';
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

type ProbeFailurePhase =
  | 'dns'
  | 'connect'
  | 'tls'
  | 'timeout'
  | 'http-status'
  | 'response'
  | 'unknown';

type ProbeProtocol = 'http' | 'https';

type ProbeResult = {
  isUp: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  ttfbMs: number | null;
  errorMessage: string | null;
  protocol?: ProbeProtocol;
  url?: string;
  dnsMs?: number | null;
  resolvedAddress?: string | null;
  resolvedFamily?: number | null;
  connectMs?: number | null;
  tlsHandshakeMs?: number | null;
  failurePhase?: ProbeFailurePhase | null;
};

type DnsResolutionResult = {
  address: string | null;
  family: number | null;
  dnsMs: number;
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

      if (settings.debugLogs) {
        this.logger.debug(
          `Public uptime probe targets | trigger=${trigger} | count=${targets.length} | domains=${targets
            .map((target) => target.domain)
            .join(',')}`,
        );
      }

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

    this.logProbeResult(target, result, settings);

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

  private async probeUrl(
    url: URL,
    settings: UptimeProbeSettings,
  ): Promise<ProbeResult> {
    const startedAt = Date.now();
    const protocol = url.protocol === 'https:' ? 'https' : 'http';
    const dnsResult = await this.resolveHostname(url.hostname, settings);

    if (!dnsResult.address) {
      return {
        isUp: false,
        statusCode: null,
        responseTimeMs: Date.now() - startedAt,
        ttfbMs: null,
        errorMessage: dnsResult.errorMessage ?? 'DNS lookup failed',
        protocol,
        url: url.toString(),
        dnsMs: dnsResult.dnsMs,
        resolvedAddress: null,
        resolvedFamily: null,
        connectMs: null,
        tlsHandshakeMs: null,
        failurePhase: 'dns',
      };
    }

    return new Promise((resolve) => {
      let settled = false;
      let ttfbMs: number | null = null;
      let connectMs: number | null = null;
      let tlsHandshakeMs: number | null = null;
      let timeoutTriggered = false;
      const client = protocol === 'https' ? https : http;

      const finish = (result: ProbeResult) => {
        if (settled) return;
        settled = true;
        resolve({
          ...result,
          protocol,
          url: url.toString(),
          dnsMs: dnsResult.dnsMs,
          resolvedAddress: dnsResult.address,
          resolvedFamily: dnsResult.family,
          connectMs,
          tlsHandshakeMs,
        });
      };

      const request = client.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || (protocol === 'https' ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method: 'GET',
          timeout: settings.timeoutMs,
          servername: url.hostname,
          headers: {
            Host: url.host,
            'User-Agent': settings.userAgent,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            Connection: 'close',
          },
          lookup: (_hostname, _options, callback) => {
            callback(null, dnsResult.address!, dnsResult.family ?? 4);
          },
        },
        (response) => {
          ttfbMs = Date.now() - startedAt;
          const statusCode = response.statusCode ?? null;
          const isAccepted = statusCode
            ? this.isAcceptedStatusCode(statusCode, settings)
            : false;

          // For public uptime, HTTP response headers are enough to prove the
          // website is reachable. Do not wait for the full HTML/body; large or
          // streaming responses can make an actually reachable website look down.
          response.resume();
          response.destroy();

          finish({
            isUp: isAccepted,
            statusCode,
            responseTimeMs: ttfbMs,
            ttfbMs,
            errorMessage: isAccepted
              ? null
              : statusCode
                ? `HTTP ${statusCode}`
                : 'No HTTP status code returned',
            failurePhase: isAccepted ? null : 'http-status',
          });
        },
      );

      request.once('socket', (socket) => {
        socket.once('connect', () => {
          connectMs = Date.now() - startedAt;
        });

        socket.once('secureConnect', () => {
          tlsHandshakeMs = Date.now() - startedAt;
        });
      });

      request.once('timeout', () => {
        timeoutTriggered = true;
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
          failurePhase: timeoutTriggered
            ? 'timeout'
            : tlsHandshakeMs === null &&
                protocol === 'https' &&
                connectMs !== null
              ? 'tls'
              : connectMs === null
                ? 'connect'
                : ttfbMs === null
                  ? 'response'
                  : 'unknown',
        });
      });

      request.end();
    });
  }

  private async resolveHostname(
    hostname: string,
    settings: UptimeProbeSettings,
  ): Promise<DnsResolutionResult> {
    const startedAt = Date.now();
    let timeout: NodeJS.Timeout | undefined;

    try {
      const family = settings.ipFamily === 0 ? undefined : settings.ipFamily;
      const lookupPromise = dns.promises.lookup(hostname, {
        family,
        verbatim: false,
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(
            new Error(`DNS lookup timed out after ${settings.dnsTimeoutMs}ms`),
          );
        }, settings.dnsTimeoutMs);
      });

      const result = await Promise.race([lookupPromise, timeoutPromise]);

      return {
        address: result.address,
        family: result.family,
        dnsMs: Date.now() - startedAt,
        errorMessage: null,
      };
    } catch (error) {
      return {
        address: null,
        family: null,
        dnsMs: Date.now() - startedAt,
        errorMessage: this.normalizeErrorMessage(error),
      };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
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
    const trimmed = domain
      .trim()
      .replace(/^https?:\/\//i, '')
      .split('/')[0];
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

  private logProbeResult(
    target: WebsiteProbeTarget,
    result: ProbeResult,
    settings: UptimeProbeSettings,
  ): void {
    const message =
      `domain=${target.domain}` +
      ` | source=${WebsiteProbeSource.BACKEND}` +
      ` | protocol=${result.protocol ?? 'unknown'}` +
      ` | url=${result.url ?? 'unknown'}` +
      ` | isUp=${result.isUp}` +
      ` | status=${result.statusCode ?? 'null'}` +
      ` | phase=${result.failurePhase ?? 'ok'}` +
      ` | responseTimeMs=${result.responseTimeMs ?? 'null'}` +
      ` | ttfbMs=${result.ttfbMs ?? 'null'}` +
      ` | dnsMs=${result.dnsMs ?? 'null'}` +
      ` | resolved=${result.resolvedAddress ?? 'null'}` +
      ` | family=${result.resolvedFamily ?? 'null'}` +
      ` | connectMs=${result.connectMs ?? 'null'}` +
      ` | tlsMs=${result.tlsHandshakeMs ?? 'null'}` +
      ` | error=${result.errorMessage ?? 'null'}`;

    if (!result.isUp) {
      this.logger.warn(`Public uptime probe down | ${message}`);
      return;
    }

    if (settings.debugLogs) {
      this.logger.debug(`Public uptime probe up | ${message}`);
    }
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
