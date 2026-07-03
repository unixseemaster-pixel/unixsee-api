import { createAppLogger } from '#/common/logging/app-logger.js';
import { envSchema, type Env } from './env.schema.js';

const logger = createAppLogger('ConfigValidation');

export function validateEnv(rawEnv: Record<string, unknown>): Env {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ✘ [${issue.path.join('.')}] ${issue.message}`)
      .join('\n');

    logger.fatal('config.env.invalid', { issues: formatted });

    // Crash at boot — never run with bad config
    process.exit(1);
  }

  logger.log('config.env.validated');
  return result.data;
}
