import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';

import { createAppLogger } from '#/common/logging/app-logger.js';
import { toEnglishDigits } from '#/utils/helpers.js';

import {
  RATE_LIMIT_METADATA_KEY,
  type RateLimitRule,
  type RateLimitValue,
} from './rate-limit.decorator.js';
import { RateLimitStore } from './rate-limit.store.js';

/**
 * Enforces the fixed-window rules declared by `@RateLimit(...)`.
 *
 * Every rule attached to a route is evaluated, so a route can be capped per IP
 * and per delivery target at once. Rejections are a bare 429 and never say
 * which rule tripped, so callers learn nothing about other callers' traffic.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = createAppLogger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly store: RateLimitStore,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const rules = this.reflector.getAllAndOverride<RateLimitRule[]>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rules?.length) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    for (const rule of rules) {
      const subject = this.resolveSubject(rule, request);

      // A rule with no attributable subject (for example a body field the
      // caller omitted) cannot be counted; validation rejects those requests.
      if (!subject) continue;

      const limit = this.resolveValue(rule.limit);
      const windowSeconds = this.resolveValue(rule.windowSeconds);

      const result = this.store.hit(
        `${rule.name}:${rule.scope}:${subject}`,
        limit,
        windowSeconds,
      );

      if (!result.allowed) {
        response.setHeader('Retry-After', String(result.retryAfterSeconds));

        this.logger.warn('rate_limit.rejected', {
          rule: rule.name,
          scope: rule.scope,
          method: request.method,
          path: request.originalUrl ?? request.url,
          limit: result.limit,
        });

        throw new HttpException(
          {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }

  /** Resolves an inline number or a configured value declared by config path. */
  private resolveValue(value: RateLimitValue): number {
    if (typeof value === 'number') return value;

    const configured = this.config.get<number>(value.configPath);

    if (typeof configured !== 'number' || !Number.isFinite(configured)) {
      throw new Error(
        `Rate limit config path "${value.configPath}" is not a number.`,
      );
    }

    return configured;
  }

  private resolveSubject(
    rule: RateLimitRule,
    request: Request,
  ): string | undefined {
    if (rule.scope === 'ip') {
      const ip = request.ip ?? request.socket?.remoteAddress;
      return ip ? this.fingerprint(ip) : undefined;
    }

    if (rule.scope === 'user') {
      const user = request.user as { id?: string; sub?: string } | undefined;
      const userId = user?.sub ?? user?.id;

      if (!userId) {
        // User-scoped rules are only valid on authenticated routes. Failing
        // closed prevents a future decorator/guard ordering mistake from
        // silently disabling the rule.
        throw new UnauthorizedException();
      }

      return this.fingerprint(userId);
    }

    const body = request.body as Record<string, unknown> | undefined;
    if (!body) return undefined;

    for (const field of rule.bodyFields ?? []) {
      const value = body[field];

      if (typeof value === 'string' && value.trim()) {
        return this.fingerprint(this.normalizeBodySubject(field, value));
      }
    }

    return undefined;
  }

  /**
   * Guards run before pipes, so rate-limit keys must perform the same
   * security-relevant canonicalization as the DTO layer.
   */
  private normalizeBodySubject(field: string, value: string): string {
    const trimmed = value.trim();

    if (field === 'phoneNumber') {
      return toEnglishDigits(trimmed) ?? trimmed;
    }

    return trimmed.toLowerCase();
  }

  /**
   * Counters are keyed by digest so raw addresses and contact details are not
   * held in the in-process index.
   */
  private fingerprint(value: string): string {
    return createHash('sha256').update(value).digest('base64url');
  }
}
