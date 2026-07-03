import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

import { AppConfigType } from '#/utils/config/app.config.js';
import { UserService } from '#/modules/user/services/user/user.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
};

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = createAppLogger(AccessTokenStrategy.name);

  constructor(
    // private readonly prisma: PrismaService,
    // private readonly reflector: Reflector,
    private readonly config: ConfigService<AppConfigType, true>,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('app', { infer: true }).jwt.accessSecret,
      // passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  // async validate(payload: JwtPayload) {
  async validate(payload: JwtPayload) {
    const user = await this.userService.findOneById(payload?.sub);
    if (!user?.hashedRt) {
      this.logger.warn('auth.access_token.rejected_user_missing_or_logged_out', {
        userId: payload?.sub,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const { hashedRt, ...restUser } = user;

    return {
      ...payload,
      ...restUser,
    };
  }
}
