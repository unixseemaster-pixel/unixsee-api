import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

import { AppConfigType } from '#/utils/config/app.config.js';
import { UserService } from '#/modules/user/services/user/user.service.js';

type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
};

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
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

    return {
      ...payload,
      ...user,
    };
  }
}
