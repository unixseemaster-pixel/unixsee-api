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

  DATABASE_URL: z.url('DATABASE_URL must be a valid URL'),

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
});

export type Env = z.infer<typeof envSchema>;
