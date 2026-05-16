import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from 'src/modules/prisma/services/prisma.service';
import { LoginDto } from '../dtos/login.dto';
import { Tokens } from '../types/tokens.types';

@Injectable()
export class AuthenticationService {
  constructor(private readonly prisma: PrismaService) {}

  async register({
    password,
    username,
    email,
    fullName,
    phoneNumber,
  }: RegisterDto) {
    // check if user exist.
    // error if exist.
    // hash password
    // return token
  }

  async login({ password, username, email, fullName, phoneNumber }: LoginDto) {
    // check if user exist.
    // error if exist.
    // check password
    // return token
  }

  private async createTokens({ userId }: { userId: string }): Promise<Tokens> {
    const accessTokenPromise = this.jwtService.signAsync(
      {
        sub: userId,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_TOKEN_KEY'),
        expiresIn: 60 * 60, // 60 minutes
      },
    );

    const refreshTokenPromise = this.jwtService.signAsync(
      {
        sub: userId,
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_KEY'),
        expiresIn: 60 * 60 * 24 * 7, // a week
      },
    );

    const [accessToken, refreshToken] = await Promise.all([
      accessTokenPromise,
      refreshTokenPromise,
    ]);

    return { accessToken, refreshToken };
  }

  private hashData(data: string) {
    return bcrypt.hash(data, 12);
  }
}
