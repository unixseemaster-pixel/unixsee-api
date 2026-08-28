import { z } from 'zod';

const booleanEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  return value;
}, z.boolean());

const acceptedStatusCodesPattern =
  /^(?:\d{3}(?:\s*-\s*\d{3})?)(?:\s*,\s*\d{3}(?:\s*-\s*\d{3})?)*$/;

export const envSchema = z.object({
  APP_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(4000),

  /**
   * Reverse proxies in front of the API whose `X-Forwarded-For` entries may be
   * believed. Express walks the chain right-to-left this many hops to resolve
   * `request.ip`, so it lands on the address our own proxy observed rather than
   * on the leftmost, entirely client-supplied entry. `0` trusts no forwarded
   * headers at all (the app is exposed directly). Setting it above the real
   * number of proxies re-opens IP spoofing, and with it every per-IP ceiling.
   */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),

  /** Nest origin for agent enroll/heartbeat (no /api/v1 suffix). */
  AGENT_API_BASE_URL: z
    .url('AGENT_API_BASE_URL must be a valid URL')
    .default('https://core.unixsee.com'),

  DATABASE_URL: z.url('DATABASE_URL must be a valid URL'),

  SUPABASE_URL: z.url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SECRET_KEY: z
    .string({ error: 'SUPABASE_SECRET_KEY is required' })
    .trim()
    .min(1, 'SUPABASE_SECRET_KEY is required'),
  SUPABASE_STORAGE_BUCKET: z
    .string({ error: 'SUPABASE_STORAGE_BUCKET is required' })
    .trim()
    .min(1, 'SUPABASE_STORAGE_BUCKET is required'),

  STORAGE_PROVIDER: z.enum(['filesystem', 's3']).default('filesystem'),
  LOCAL_STORAGE_PATH: z.string().trim().default('./storage/uploads'),

  /** Public origin for browser-facing storage download URLs. */
  STORAGE_PUBLIC_BASE_URL: z.url().optional(),
  JWT_ACCESS_SECRET: z
    .string({ error: 'JWT_ACCESS_SECRET is required' })
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),

  // JWT_ACCESS_EXPIRES_IN: z.string().default('7d'),

  JWT_REFRESH_SECRET: z
    .string({ error: 'JWT_REFRESH_SECRET is required' })
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  JWT_MONITORING_ACCESS_SECRET: z
    .string({ error: 'JWT_MONITORING_ACCESS_SECRET is required' })
    .min(32, 'JWT_MONITORING_ACCESS_SECRET must be at least 32 characters'),

  JWT_ACCESS_TOKEN_EXPIRATION: z.coerce.number().int().positive(),
  JWT_REFRESH_TOKEN_EXPIRATION: z.coerce.number().int().positive(),
  JWT_MONITORING_ACCESS_TOKEN_EXPIRATION: z.coerce.number().int().positive(),

  OTP_EXPIRED_TIME_KEY: z.coerce.number().int().positive(),
  OTP_RETRY_TIME: z.coerce.number().int().positive(),

  /** Failed verification attempts allowed per issued code before it is dead. */
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().positive().default(5),
  /** Codes a single phone/email may be issued inside the rolling window. */
  OTP_MAX_REQUESTS_PER_WINDOW: z.coerce.number().int().positive().default(5),
  OTP_REQUEST_WINDOW_MINUTES: z.coerce.number().int().positive().default(60),

  /** Per-IP ceiling on OTP issue requests, independent of the target. */
  OTP_IP_REQUEST_LIMIT: z.coerce.number().int().positive().default(10),
  OTP_IP_REQUEST_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(600),
  /** Per-IP ceiling on OTP verification attempts, independent of the target. */
  OTP_IP_VERIFY_LIMIT: z.coerce.number().int().positive().default(20),
  OTP_IP_VERIFY_WINDOW_SECONDS: z.coerce.number().int().positive().default(600),

  /**
   * Ceiling on verification attempts aimed at one phone/email from any address.
   * Complements the per-challenge attempt limit, which cannot count attempts
   * against a target that has no outstanding challenge.
   */
  OTP_TARGET_VERIFY_LIMIT: z.coerce.number().int().positive().default(10),
  OTP_TARGET_VERIFY_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(600),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((origins) =>
      origins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  UPTIME_PROBES_ENABLED: booleanEnv.default(true),
  UPTIME_PROBE_CRON: z.string().trim().min(1).default('* * * * *'),
  UPTIME_PROBE_STARTUP_DELAY_MS: z.coerce.number().int().min(0).default(5000),
  UPTIME_PROBE_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  UPTIME_PROBE_DNS_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  UPTIME_PROBE_PROXY_URL: z.url().optional(),
  UPTIME_PROBE_SKIP_DNS_PREFLIGHT: booleanEnv.default(false),
  UPTIME_PROBE_IP_FAMILY: z.coerce
    .number()
    .pipe(z.union([z.literal(0), z.literal(4), z.literal(6)]))
    .default(0),
  UPTIME_PROBE_DEBUG_LOGS: booleanEnv.default(false),
  UPTIME_PROBE_CONCURRENCY: z.coerce.number().int().positive().default(10),
  UPTIME_PROBE_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  UPTIME_PROBE_ALLOW_HTTP_FALLBACK: booleanEnv.default(false),
  UPTIME_PROBE_ACCEPT_STATUS_CODES: z
    .string()
    .trim()
    .regex(
      acceptedStatusCodesPattern,
      'UPTIME_PROBE_ACCEPT_STATUS_CODES must be a comma-separated list of HTTP codes or ranges, e.g. 200-399,401,403',
    )
    .default('200-399,401,403'),
  UPTIME_PROBE_USER_AGENT: z
    .string()
    .trim()
    .min(1)
    .default('Unixsee-Uptime-Probe/1.0 (+https://unixsee.com)'),

  TICKET_AUTO_CLOSE_ENABLED: booleanEnv.default(true),
  TICKET_AUTO_CLOSE_GRACE_DAYS: z.coerce
    .number()
    .int()
    .min(5)
    .max(7)
    .default(7),
  TICKET_AUTO_CLOSE_CRON: z.string().trim().min(1).default('0 * * * *'),

  // Temporary phone-OTP delivery via SMTP (SMS stand-in).
  EMAIL_SMTP_HOST: z.string().trim().min(1),
  EMAIL_SMTP_PORT: z.coerce.number().int().positive().default(465),
  EMAIL_SMTP_SECURE: booleanEnv.default(true),
  EMAIL_SMTP_TLS_REJECT_UNAUTHORIZED: booleanEnv.default(true),
  EMAIL_SMTP_USER: z.string().trim().min(1),
  EMAIL_SMTP_PASSWORD: z.string().min(1),
  EMAIL_FROM: z.string().trim().min(1),
  PHONE_OTP_MOCK_DELIVERY_EMAIL: z
    .string()
    .trim()
    .email()
    .default('arvin.ramezani6@gmail.com'),
});

export type Env = z.infer<typeof envSchema>;
