import { Logger } from '@nestjs/common';
import { envSchema, type Env } from './env.schema.js';

const logger = new Logger('ConfigValidation');

export function validateEnv(rawEnv: Record<string, unknown>): Env {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✘ [${issue.path.join('.')}] ${issue.message}`)
      .join('\n');

    logger.error(`\n\n❌ Invalid environment variables:\n${formatted}\n`);

    // Crash at boot — never run with bad config
    process.exit(1);
  }

  logger.log('✅ Environment variables validated successfully');
  return result.data;
}
