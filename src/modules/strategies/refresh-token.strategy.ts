import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../prisma/services/prisma.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // default
      passReqToCallback: true, // get back jwt
      secretOrKey:
        configService.get<string>('NODE_ENV') === 'test'
          ? 'testSecretKey'
          : configService.get<string>('JWT_REFRESH_TOKEN_KEY'),
    });
  }

  async validate(req: Request, payload: any) {
    const refreshToken = req.get('authorization').replace('Bearer', '').trim();

    // const user = await this.prisma.user.findUnique({
    //   where: { id: payload.sub },
    // });

    if (!user.hashedRt)
      throw Response.unauthorized(null, 'توکن معتبر نیست، لطفا ثبت نام کنید');

    return {
      ...payload,
      refreshToken,
    };
  }
}
