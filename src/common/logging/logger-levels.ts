import type { LogLevel } from '@nestjs/common';

export function getLoggerLevels(nodeEnv?: string): LogLevel[] {
  if (nodeEnv === 'production') {
    return ['log', 'warn', 'error', 'fatal'];
  }

  if (nodeEnv === 'test') {
    return ['error', 'fatal'];
  }

  return ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'];
}
