import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z
    .string({ error: 'DATABASE_URL is required' })
    .url('DATABASE_URL must be a valid URL'),

  JWT_ACCESS_SECRET: z
    .string({ error: 'JWT_SECRET is required' })
    .min(32, 'JWT_SECRET must be at least 32 characters'),

  JWT_ACCESS_EXPIRES_IN: z.string().default('7d'),

  JWT_REFRESH_SECRET: z
    .string({ error: 'JWT_SECRET is required' })
    .min(32, 'JWT_SECRET must be at least 32 characters'),

  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  FRONTEND_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;
