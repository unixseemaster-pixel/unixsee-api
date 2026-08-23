import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import type { AppConfigType } from '#/utils/config/app.config.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import { UsersService } from '#/modules/users/services/users.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  private readonly logger = createAppLogger(RefreshTokenStrategy.name);

  constructor(
    private readonly config: ConfigService<AppConfigType, true>,
    private readonly userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('app', { infer: true }).jwt.refreshSecret,
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.get('authorization')?.replace('Bearer', '').trim();

    const user = await this.userService.findOneById(payload?.sub);

    if (!user?.hashedRt) {
      this.logger.warn('auth.refresh_token.rejected_user_missing_or_logged_out', {
        userId: payload?.sub,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }
    return {
      ...payload,
      refreshToken,
    };
  }
}
