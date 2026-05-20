import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

import type { AppConfigType } from '#/utils/config/app.config.js';
import type { PrismaService } from '../prisma/services/prisma.service.js';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    // private readonly prisma: PrismaService,
    // private readonly reflector: Reflector,
    private readonly config: ConfigService<AppConfigType, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('app', { infer: true }).jwt.accessSecret,
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  // async validate(payload: JwtPayload) {
  async validate(payload: {}) {
    // const user = await this.prisma.user.findUnique({
    //   where: { id: payload.sub },
    // });

    return {
      ...payload,
      //   role: user.role,
      //   fullName: user.fullName,
    };
  }
}
