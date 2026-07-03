import { Logger } from '@nestjs/common';

import { RequestContext } from './request-context.js';

export type LogFields = Record<string, unknown>;

type ErrorLike = Error | string;

const SENSITIVE_KEY_PATTERN =
  /(^|_)(password|token|secret|signature|authorization|cookie|otp|hash|key)($|_)/i;

export class AppLogger {
  private readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  log(event: string, fields?: LogFields): void {
    this.logger.log(this.format(event, fields));
  }

  warn(event: string, fields?: LogFields): void {
    this.logger.warn(this.format(event, fields));
  }

  debug(event: string, fields?: LogFields): void {
    this.logger.debug(this.format(event, fields));
  }

  verbose(event: string, fields?: LogFields): void {
    this.logger.verbose(this.format(event, fields));
  }

  fatal(event: string, fields?: LogFields): void {
    this.logger.fatal(this.format(event, fields));
  }

  error(event: string, errorOrFields?: ErrorLike | LogFields, fields?: LogFields): void {
    const { trace, metadata } = this.normalizeErrorArgs(errorOrFields, fields);
    this.logger.error(this.format(event, metadata), trace);
  }

  private normalizeErrorArgs(
    errorOrFields?: ErrorLike | LogFields,
    fields?: LogFields,
  ): { trace?: string; metadata?: LogFields } {
    if (!errorOrFields) {
      return { metadata: fields };
    }

    if (errorOrFields instanceof Error) {
      return {
        trace: errorOrFields.stack,
        metadata: {
          ...fields,
          errorName: errorOrFields.name,
          errorMessage: errorOrFields.message,
        },
      };
    }

    if (typeof errorOrFields === 'string') {
      return { trace: errorOrFields, metadata: fields };
    }

    return { metadata: { ...errorOrFields, ...fields } };
  }

  private format(event: string, fields?: LogFields): string {
    const store = RequestContext.getStore();
    const metadata = this.cleanMetadata({
      requestId: store?.requestId,
      userId: store?.userId,
      ...fields,
    });

    if (Object.keys(metadata).length === 0) {
      return event;
    }

    return `${event} | ${JSON.stringify(metadata)}`;
  }

  private cleanMetadata(fields: LogFields): LogFields {
    return Object.entries(fields).reduce<LogFields>((result, [key, value]) => {
      if (value === undefined || value === null) return result;

      if (this.isSensitiveKey(key)) {
        result[key] = '[REDACTED]';
        return result;
      }

      result[key] = this.cleanValue(key, value);
      return result;
    }, {});
  }

  private isSensitiveKey(key: string): boolean {
    const normalized = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    return SENSITIVE_KEY_PATTERN.test(normalized);
  }

  private cleanValue(key: string, value: unknown): unknown {
    if (typeof value === 'bigint') return value.toString();

    if (typeof value === 'string') {
      if (/phone/i.test(key)) return this.maskPhone(value);
      if (/email/i.test(key)) return this.maskEmail(value);
      return value;
    }

    if (value instanceof Date) return value.toISOString();

    if (Array.isArray(value)) {
      return value.length > 20 ? `[Array(${value.length})]` : value;
    }

    if (typeof value === 'object' && value !== null) {
      return '[Object]';
    }

    return value;
  }

  private maskPhone(value: string): string {
    if (value.length <= 4) return '***';
    return `${value.slice(0, 3)}***${value.slice(-2)}`;
  }

  private maskEmail(value: string): string {
    const [name, domain] = value.split('@');
    if (!domain) return '[REDACTED]';
    return `${name.slice(0, 2)}***@${domain}`;
  }
}

export function createAppLogger(context: string): AppLogger {
  return new AppLogger(context);
}
