import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { UserService } from '#/modules/user/services/user/user.service.js';
import type { AppConfigType } from '#/utils/config/app.config.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import type { LoginDto } from '../dto/login.dto.js';
import type { Tokens } from '../types/tokens.types.js';
import type { RegisterDto } from '../dto/register.dto.js';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfigType, true>,
  ) {}

  async register({
    password,
    username,
    email,
    fullName,
    phoneNumber,
  }: RegisterDto) {
    const user = await this.userService.findOneByUsername({ username });

    if (user) throw new ConflictException(ERROR_MESSAGES.fa.userExist);

    const hashedPassword = await this.hashData(password);

    const createdUser = await this.userService.create({
      username,
      password: hashedPassword,
      email,
      fullName,
      phoneNumber,
    });

    const tokens = this.createTokens({ userId: createdUser.id });
    return tokens;
  }

  async login({ password, username, email, phoneNumber }: LoginDto) {
    const existUser = await this.userService.findOneByUsername({ username });
    if (!existUser) {
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const isPassCorrect = await bcrypt.compare(password, existUser.password);

    if (!isPassCorrect)
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);

    const tokens = await this.createTokens({ userId: existUser.id });

    return tokens;
  }

  private async createTokens({ userId }: { userId: string }): Promise<Tokens> {
    const accessTokenPromise = this.jwtService.signAsync(
      {
        sub: userId,
      },
      {
        secret: this.config.get('app', { infer: true }).jwt.accessSecret,
        expiresIn: 60 * 60, // 60 minutes
      },
    );

    const refreshTokenPromise = this.jwtService.signAsync(
      {
        sub: userId,
      },
      {
        secret: this.config.get('app', { infer: true }).jwt.refreshSecret,
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
