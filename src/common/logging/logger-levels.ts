import type { LogLevel } from '@nestjs/common';

export type AppRuntimeEnvironment = 'development' | 'staging' | 'production' | 'test';

export function getLoggerLevels(
  appEnv?: string,
  nodeEnv?: string,
): LogLevel[] {
  const resolvedEnv = resolveRuntimeEnvironment(appEnv, nodeEnv);

  if (resolvedEnv === 'production') {
    return ['log', 'warn', 'error', 'fatal'];
  }

  if (resolvedEnv === 'staging') {
    return ['log', 'warn', 'error', 'debug', 'fatal'];
  }

  if (resolvedEnv === 'test') {
    return ['error', 'fatal'];
  }

  return ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'];
}

function resolveRuntimeEnvironment(
  appEnv?: string,
  nodeEnv?: string,
): AppRuntimeEnvironment {
  if (appEnv === 'staging') return 'staging';
  if (appEnv === 'production') return 'production';
  if (appEnv === 'test') return 'test';
  if (appEnv === 'development') return 'development';

  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'test') return 'test';

  return 'development';
}
