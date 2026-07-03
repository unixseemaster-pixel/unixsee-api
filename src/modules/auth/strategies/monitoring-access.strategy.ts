import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

import { AppConfigType } from '#/utils/config/app.config.js';
import { UserService } from '#/modules/user/services/user/user.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import { Request } from 'express';
import { createAppLogger } from '#/common/logging/app-logger.js';

type MonitoringAccessJwtPayload = {
  sub: string;
  purpose: 'MONITORING_ACCESS';
  iat: number;
  exp: number;
};

function extractMonitoringAccessToken(req: any): string | null {
  const value = req.get('Monitoring-Access-Token');

  if (!value) {
    return null;
  }

  return value.replace(/^Bearer\s+/i, '').trim();
}

@Injectable()
export class MonitoringAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-monitoring-access',
) {
  private readonly logger = createAppLogger(MonitoringAccessStrategy.name);

  constructor(
    // private readonly prisma: PrismaService,
    // private readonly reflector: Reflector,
    private readonly config: ConfigService<AppConfigType, true>,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractMonitoringAccessToken]),
      secretOrKey: config.get('app', { infer: true }).jwt
        .monitoringAccessSecret,
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  async validate(req: Request, payload: MonitoringAccessJwtPayload) {
    if (payload.purpose !== 'MONITORING_ACCESS') {
      this.logger.warn('auth.monitoring_access_token.rejected_wrong_purpose', {
        userId: payload.sub,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const authenticatedUser = req.user as
      | { id?: string; sub?: string }
      | undefined;

    const authenticatedUserId = authenticatedUser?.id ?? authenticatedUser?.sub;

    if (!authenticatedUserId || authenticatedUserId !== payload.sub) {
      this.logger.warn('auth.monitoring_access_token.rejected_user_mismatch', {
        authenticatedUserId,
        tokenUserId: payload.sub,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const user = await this.userService.findOneById(payload.sub);

    if (!user?.hashedRt) {
      this.logger.warn('auth.monitoring_access_token.rejected_user_missing_or_logged_out', {
        userId: payload.sub,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    return {
      ...payload,
      monitoringAccess: true,
    };
  }
}
