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

@Injectable()
export class AuthenticationService {
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
    id,
  }: RegisterDto & { id: string }) {
    const user = await this.userService.findOneById({ id });

    if (user) throw new ConflictException(ERROR_MESSAGES.fa);

    const hashedPassword = this.hashData(password);
    // save password in db.

    const tokens = this.createTokens({ userId: id });
    return tokens;
  }

  async login({
    id,
    password,
    username,
    email,
    fullName,
    phoneNumber,
  }: LoginDto & { id: string }) {
    const existUser = await this.userService.findOneById(id);
    if (!existUser) {
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const decryptedPassword = await bcrypt.compare(
      existUser.password,
      password,
    );

    if (!decryptedPassword)
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);

    const tokens = await this.createTokens({ userId: id });

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
