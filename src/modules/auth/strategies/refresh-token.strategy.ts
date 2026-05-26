import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import type { AppConfigType } from '#/utils/config/app.config.js';

import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly config: ConfigService<AppConfigType, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('app', { infer: true }).jwt.accessSecret,
      passReqToCallback: true,
      ignoreExpiration: false,
    });
    // super({
    //   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    //   ignoreExpiration: false, // default
    //   passReqToCallback: true, // get back jwt
    //   secretOrKey:
    //     configService.get<string>('NODE_ENV') === 'test'
    //       ? 'testSecretKey'
    //       : configService.get<string>('JWT_REFRESH_TOKEN_KEY'),
    // });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.get('authorization')?.replace('Bearer', '').trim();

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user?.hashedRt)
      new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);

    return {
      ...payload,
      refreshToken,
    };
  }
}
