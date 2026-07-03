import { registerAs } from '@nestjs/config';
import { envSchema } from './env.schema.js';

export type StatusCodeRange = {
  from: number;
  to: number;
};

function parseAcceptedStatusCodeRanges(input: string): StatusCodeRange[] {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const rangeMatch = part.match(/^(\d{3})\s*-\s*(\d{3})$/);

      if (rangeMatch) {
        const from = Number(rangeMatch[1]);
        const to = Number(rangeMatch[2]);
        return from <= to ? { from, to } : { from: to, to: from };
      }

      const code = Number(part);
      return { from: code, to: code };
    });
}

const appConfig = registerAs('app', () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(result.error.toString());
  }

  const env = result.data;

  return {
    appEnv: env.APP_ENV,
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS,
    otpExpiredTime: env.OTP_EXPIRED_TIME_KEY,
    otpRetryTime: env.OTP_RETRY_TIME,
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessExpiresIn: env.JWT_ACCESS_TOKEN_EXPIRATION,
      refreshExpiresIn: env.JWT_REFRESH_TOKEN_EXPIRATION,
      monitoringAccessSecret: env.JWT_MONITORING_ACCESS_SECRET,
      monitoringAccessExpiresIn: env.JWT_MONITORING_ACCESS_TOKEN_EXPIRATION,
    },
    uptimeProbes: {
      enabled: env.UPTIME_PROBES_ENABLED,
      cronExpression: env.UPTIME_PROBE_CRON,
      startupDelayMs: env.UPTIME_PROBE_STARTUP_DELAY_MS,
      timeoutMs: env.UPTIME_PROBE_TIMEOUT_MS,
      dnsTimeoutMs: env.UPTIME_PROBE_DNS_TIMEOUT_MS,
      proxyUrl: env.UPTIME_PROBE_PROXY_URL,
      skipDnsPreflight: env.UPTIME_PROBE_SKIP_DNS_PREFLIGHT,
      ipFamily: env.UPTIME_PROBE_IP_FAMILY,
      debugLogs: env.UPTIME_PROBE_DEBUG_LOGS,
      concurrency: env.UPTIME_PROBE_CONCURRENCY,
      batchSize: env.UPTIME_PROBE_BATCH_SIZE,
      allowHttpFallback: env.UPTIME_PROBE_ALLOW_HTTP_FALLBACK,
      acceptedStatusCodeRanges: parseAcceptedStatusCodeRanges(
        env.UPTIME_PROBE_ACCEPT_STATUS_CODES,
      ),
      userAgent: env.UPTIME_PROBE_USER_AGENT,
    },
  };
});

export default appConfig;

export type AppConfigType = { app: ReturnType<typeof appConfig> };
