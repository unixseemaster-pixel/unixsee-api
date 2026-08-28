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
    trustProxyHops: env.TRUST_PROXY_HOPS,
    agentApiBaseUrl: env.AGENT_API_BASE_URL.replace(/\/$/, ''),
    databaseUrl: env.DATABASE_URL,
    storage: {
      url: env.SUPABASE_URL.replace(/\/$/, ''),
      secretKey: env.SUPABASE_SECRET_KEY,
      bucket: env.SUPABASE_STORAGE_BUCKET,
      provider: env.STORAGE_PROVIDER,
      localStoragePath: env.LOCAL_STORAGE_PATH,
      publicBaseUrl:
        env.STORAGE_PUBLIC_BASE_URL?.replace(/\/$/, '') ??
        (env.APP_ENV === 'development' || env.APP_ENV === 'test'
          ? `http://localhost:${env.PORT}`
          : env.AGENT_API_BASE_URL.replace(/\/$/, '')),
    },
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS,
    otp: {
      expiredTimeMinutes: env.OTP_EXPIRED_TIME_KEY,
      retryTimeMinutes: env.OTP_RETRY_TIME,
      maxVerifyAttempts: env.OTP_MAX_VERIFY_ATTEMPTS,
      maxRequestsPerWindow: env.OTP_MAX_REQUESTS_PER_WINDOW,
      requestWindowMinutes: env.OTP_REQUEST_WINDOW_MINUTES,
      ipRequestLimit: env.OTP_IP_REQUEST_LIMIT,
      ipRequestWindowSeconds: env.OTP_IP_REQUEST_WINDOW_SECONDS,
      ipVerifyLimit: env.OTP_IP_VERIFY_LIMIT,
      ipVerifyWindowSeconds: env.OTP_IP_VERIFY_WINDOW_SECONDS,
      targetVerifyLimit: env.OTP_TARGET_VERIFY_LIMIT,
      targetVerifyWindowSeconds: env.OTP_TARGET_VERIFY_WINDOW_SECONDS,
    },
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
    tickets: {
      autoCloseEnabled: env.TICKET_AUTO_CLOSE_ENABLED,
      autoCloseGraceDays: env.TICKET_AUTO_CLOSE_GRACE_DAYS,
      autoCloseCronExpression: env.TICKET_AUTO_CLOSE_CRON,
    },
    mail: {
      smtpHost: env.EMAIL_SMTP_HOST,
      smtpPort: env.EMAIL_SMTP_PORT,
      smtpSecure: env.EMAIL_SMTP_SECURE,
      smtpTlsRejectUnauthorized: env.EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED,
      smtpUser: env.EMAIL_SMTP_USER,
      smtpPassword: env.EMAIL_SMTP_PASSWORD,
      from: env.EMAIL_FROM,
      phoneOtpMockDeliveryEmail: env.PHONE_OTP_MOCK_DELIVERY_EMAIL,
    },
  };
});

export default appConfig;

export type AppConfigType = { app: ReturnType<typeof appConfig> };
