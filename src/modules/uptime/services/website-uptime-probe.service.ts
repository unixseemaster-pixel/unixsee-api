import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { EventDispatcherService } from '#/modules/event/event-dispatcher.service.js';
import { WebsiteProbeSource } from '#/generated/prisma/enums.js';

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

type StatusMatcher = (statusCode: number) => boolean;

@Injectable()
export class WebsiteUptimeProbeService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(WebsiteUptimeProbeService.name);
  private readonly enabled = this.readBooleanEnv('UPTIME_PROBES_ENABLED', true);
  private readonly intervalMs = this.readPositiveIntEnv(
    'UPTIME_PROBE_INTERVAL_MS',
    60_000,
  );
  private readonly startupDelayMs = this.readPositiveIntEnv(
    'UPTIME_PROBE_STARTUP_DELAY_MS',
    5_000,
  );
  private readonly timeoutMs = this.readPositiveIntEnv(
    'UPTIME_PROBE_TIMEOUT_MS',
    8_000,
  );
  private readonly concurrency = this.readPositiveIntEnv(
    'UPTIME_PROBE_CONCURRENCY',
    10,
  );
  private readonly batchSize = this.readPositiveIntEnv(
    'UPTIME_PROBE_BATCH_SIZE',
    100,
  );
  private readonly allowHttpFallback = this.readBooleanEnv(
    'UPTIME_PROBE_ALLOW_HTTP_FALLBACK',
    false,
  );
  private readonly acceptedStatusMatcher = this.parseAcceptedStatusCodes(
    process.env.UPTIME_PROBE_ACCEPT_STATUS_CODES ?? '200-399,401,403',
  );
  private readonly userAgent =
    process.env.UPTIME_PROBE_USER_AGENT?.trim() ||
    'Unixsee-Uptime-Probe/1.0 (+https://unixsee.com)';

  private intervalTimer: NodeJS.Timeout | null = null;
  private startupTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventDispatcher: EventDispatcherService,
  ) {}

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Public website uptime probes are disabled.');
      return;
    }

    this.startupTimer = setTimeout(() => {
      this.probeAllActiveWebsites().catch((error) => {
        this.logger.error(
          `Initial uptime probe cycle failed: ${this.formatError(error)}`,
        );
      });
    }, this.startupDelayMs);

    this.intervalTimer = setInterval(() => {
      this.probeAllActiveWebsites().catch((error) => {
        this.logger.error(
          `Scheduled uptime probe cycle failed: ${this.formatError(error)}`,
        );
      });
    }, this.intervalMs);

    this.startupTimer.unref();
    this.intervalTimer.unref();

    this.logger.log(
      `Public website uptime probes enabled | intervalMs=${this.intervalMs} | timeoutMs=${this.timeoutMs} | concurrency=${this.concurrency} | source=${WebsiteProbeSource.BACKEND}`,
    );
  }

  onModuleDestroy(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  async probeAllActiveWebsites(): Promise<{
    checked: number;
    up: number;
    down: number;
  }> {
    if (this.isRunning) {
      this.logger.debug('Skipping uptime probe cycle because previous cycle is still running.');
      return { checked: 0, up: 0, down: 0 };
    }

    this.isRunning = true;
    const startedAt = Date.now();

    try {
      const targets = await this.prisma.website.findMany({
        where: { isActive: true },
        orderBy: { domain: 'asc' },
        take: this.batchSize,
        select: {
          id: true,
          domain: true,
        },
      });

      const results = await this.mapWithConcurrency(
        targets,
        this.concurrency,
        (target) => this.probeAndPersist(target),
      );

      const checked = results.length;
      const up = results.filter((result) => result.isUp).length;
      const down = checked - up;

      this.logger.log(
        `Public uptime probe cycle completed | checked=${checked} | up=${up} | down=${down} | durationMs=${Date.now() - startedAt}`,
      );

      return { checked, up, down };
    } finally {
      this.isRunning = false;
    }
  }

  private async probeAndPersist(target: WebsiteProbeTarget): Promise<ProbeResult> {
    const recordedAt = new Date();
    const result = await this.probeWebsite(target.domain);

    await this.prisma.websiteProbeMetric.createMany({
      data: [
        {
          recordedAt,
          websiteId: target.id,
          probeSource: WebsiteProbeSource.BACKEND,
          isUp: result.isUp,
          statusCode: result.statusCode,
          responseTimeMs: result.responseTimeMs,
          ttfbMs: result.ttfbMs,
          errorMessage: result.errorMessage,
        },
      ],
      skipDuplicates: true,
    });

    await this.prisma.website.update({
      where: { id: target.id },
      data: {
        lastIsUp: result.isUp,
        lastStatusCode: result.statusCode,
        lastResponseTimeMs: result.responseTimeMs,
        lastProbeAt: recordedAt,
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
        lastProbeAt: recordedAt.toISOString(),
      },
      timestamp: recordedAt.toISOString(),
    });

    return result;
  }

  private async probeWebsite(domain: string): Promise<ProbeResult> {
    const normalizedDomain = this.normalizeDomain(domain);
    const httpsResult = await this.probeUrl(
      new URL(`https://${normalizedDomain}/`),
    );

    if (httpsResult.isUp || !this.allowHttpFallback) {
      return httpsResult;
    }

    const httpResult = await this.probeUrl(
      new URL(`http://${normalizedDomain}/`),
    );

    return httpResult.isUp ? httpResult : httpsResult;
  }

  private probeUrl(url: URL): Promise<ProbeResult> {
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
          timeout: this.timeoutMs,
          servername: url.hostname,
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            Connection: 'close',
          },
        },
        (response) => {
          ttfbMs = Date.now() - startedAt;
          const statusCode = response.statusCode ?? null;
          const isAccepted = statusCode
            ? this.acceptedStatusMatcher(statusCode)
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
        request.destroy(new Error(`Probe timed out after ${this.timeoutMs}ms`));
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

  private normalizeDomain(domain: string): string {
    const trimmed = domain.trim().replace(/^https?:\/\//i, '').split('/')[0];
    return trimmed.replace(/\.$/, '');
  }

  private parseAcceptedStatusCodes(input: string): StatusMatcher {
    const ranges = input
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const rangeMatch = part.match(/^(\d{3})\s*-\s*(\d{3})$/);

        if (rangeMatch) {
          return {
            from: Number(rangeMatch[1]),
            to: Number(rangeMatch[2]),
          };
        }

        const code = Number(part);
        return Number.isInteger(code) ? { from: code, to: code } : null;
      })
      .filter((range): range is { from: number; to: number } =>
        Boolean(range),
      );

    return (statusCode: number) =>
      ranges.some((range) => statusCode >= range.from && statusCode <= range.to);
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

  private readBooleanEnv(name: string, fallback: boolean): boolean {
    const value = process.env[name];

    if (value === undefined || value.trim() === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  private readPositiveIntEnv(name: string, fallback: number): number {
    const value = Number(process.env[name]);
    return Number.isInteger(value) && value > 0 ? value : fallback;
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
