import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    // private readonly prisma: PrismaService,
    // private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // default

      secretOrKey:
        configService.get<string>('NODE_ENV') === 'test'
          ? 'testSecretKey'
          : configService.get<string>('JWT_ACCESS_TOKEN_KEY'),
    });
  }

  async validate(payload: JwtPayload) {
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
