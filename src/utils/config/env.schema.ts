import { z } from 'zod';

export const envSchema = z.object({
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

  // FRONTEND_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;
