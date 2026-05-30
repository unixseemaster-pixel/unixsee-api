import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { MESSAGES } from '@nestjs/core/constants.js';
import { OtpContext } from '#/generated/prisma/enums.js';
import { User } from '#/generated/prisma/client.js';
import { OtpService } from './otp-service.js';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
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

    if (!existUser?.password)
      throw new BadRequestException(
        "You didn't set password for your account.",
      );

    const isPassCorrect = await bcrypt.compare(password, existUser.password);

    if (!isPassCorrect)
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);

    const tokens = await this.createTokens({ userId: existUser.id });

    return tokens;
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.userService.findOneById(userId);
    if (!user || !user.hashedRt)
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);

    const isRtValid = await bcrypt.compare(refreshToken, user.hashedRt);
    if (!isRtValid)
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);

    return this.createTokens({ userId: user.id });
  }

  async sendOtp({
    phoneNumber,
    context,
  }: {
    phoneNumber: string;
    context?: OtpContext;
  }) {
    const otp = await this.otpService.createAndOverwrite({
      length: 6,
      phoneNumber,
      context,
    });

    return { status: 'success', otp };
  }

  async validateOtp({
    otp,
    phoneNumber,
  }: {
    phoneNumber: string;
    otp: string;
  }) {
    const isOtpValid = await this.otpService.validateOtp({
      phoneNumber,
      otp,
    });

    if (!isOtpValid) throw new UnauthorizedException('wrong credentials.');

    let userToSignIn: Omit<User, 'password' | 'hashedRt'>;
    const userExist = await this.userService.findOneByPhoneNumber(phoneNumber);

    if (!userExist) {
      userToSignIn = await this.userService.create({
        phoneNumber,
        role: 'USER',
      });
    } else {
      userToSignIn = userExist;
    }
    const tokens = await this.createTokens({
      userId: userToSignIn.id,
    });

    const updateRtHashPromise = this.userService.updateRtHash({
      userId: userToSignIn.id,
      rt: tokens.refreshToken,
    });

    const removeOtpPromise = this.otpService.remove(otp);

    await Promise.all([updateRtHashPromise, removeOtpPromise]);

    return {
      ...tokens,
      ...userToSignIn,
    };
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
