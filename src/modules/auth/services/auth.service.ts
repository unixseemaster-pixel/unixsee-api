import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from 'src/modules/prisma/services/prisma.service';
import { LoginDto } from '../dtos/login.dto';
import { Tokens } from '../types/tokens.types';
import { UserService } from 'src/modules/user/services/user/user.service';
import { ERROR_MESSAGES } from 'src/utils/error-messages';
import { RegisterDto } from '../dtos/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async register({
    password,
    username,
    email,
    fullName,
    phoneNumber,
  }: RegisterDto) {
    const user = await this.userService.findOneByUsername({ username });

    if (user) throw new ConflictException(ERROR_MESSAGES.fa);

    const hashedPassword = this.hashData(password);
    // save password in db.

    const tokens = this.createTokens({ userId: id });
    return tokens;
  }

  async login({ password, username, email, fullName, phoneNumber }: LoginDto) {
    const existUser = await this.userService.findOneByUsername({ username });
    if (!existUser) {
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const decryptedPassword = await bcrypt.compare(
      existUser.password,
      password,
    );

    if (!decryptedPassword)
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
