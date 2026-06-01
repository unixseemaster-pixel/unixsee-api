import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
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
import { OtpContext } from '#/generated/prisma/enums.js';
import { User } from '#/generated/prisma/client.js';
import { OtpService } from './otp-service.js';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

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
    this.logger.log(`Register attempt for username: ${username}`);

    const user = await this.userService.findOneByUsername({ username });

    if (user) {
      this.logger.warn(`Register rejected, user already exists: ${username}`);
      throw new ConflictException(ERROR_MESSAGES.fa.userExist);
    }

    const hashedPassword = await this.hashData(password);

    const createdUser = await this.userService.create({
      username,
      password: hashedPassword,
      email,
      fullName,
      phoneNumber,
    });

    const tokens = this.createTokens({ userId: createdUser.id });
    this.logger.log(`User registered successfully: ${createdUser.id}`);
    return tokens;
  }

  async login({ password, username, email, phoneNumber }: LoginDto) {
    this.logger.log(`Login attempt for username: ${username}`);

    const existUser = await this.userService.findOneByUsername({ username });
    if (!existUser) {
      this.logger.warn(`Login rejected, user not found: ${username}`);
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    if (!existUser?.password) {
      this.logger.warn(`Login rejected, password is not set: ${existUser.id}`);
      throw new BadRequestException(
        "You didn't set password for your account.",
      );
    }

    const isPassCorrect = await bcrypt.compare(password, existUser.password);

    if (!isPassCorrect) {
      this.logger.warn(`Login rejected, invalid password: ${existUser.id}`);
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const tokens = await this.createTokens({ userId: existUser.id });

    this.logger.log(`User logged in successfully: ${existUser.id}`);
    return tokens;
  }

  async refresh(userId: string, refreshToken: string) {
    this.logger.log(`Refresh token attempt for user: ${userId}`);

    const user = await this.userService.findOneById(userId);
    if (!user || !user.hashedRt) {
      this.logger.warn(`Refresh rejected, user or hash not found: ${userId}`);
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const isRtValid = await bcrypt.compare(refreshToken, user.hashedRt);
    if (!isRtValid) {
      this.logger.warn(`Refresh rejected, invalid refresh token: ${userId}`);
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    this.logger.log(`Refresh token accepted for user: ${user.id}`);
    return this.createTokens({ userId: user.id });
  }

  async logout(userId: string) {
    this.logger.log(`Logout attempt for user: ${userId}`);

    const user = await this.prisma.user.update({
      where: {
        id: userId,
        hashedRt: { not: null },
      },
      data: {
        hashedRt: null,
      },
      omit: {
        password: true,
        hashedRt: true,
      },
    });

    this.logger.log(`User logged out successfully: ${userId}`);
    return user;
  }

  async sendOtp({
    phoneNumber,
    context,
  }: {
    phoneNumber: string;
    context?: OtpContext;
  }) {
    this.logger.log(`OTP request for context: ${context ?? 'UNKNOWN'}`);

    const otp = await this.otpService.createAndOverwrite({
      length: 6,
      phoneNumber,
      context,
    });

    this.logger.log(`OTP created for context: ${context ?? 'UNKNOWN'}`);
    return { otp: otp.otp };
  }

  async validateOtp({
    otp,
    phoneNumber,
    context,
  }: {
    phoneNumber: string;
    otp: string;
    context: OtpContext;
  }) {
    this.logger.log(`OTP validation attempt for context: ${context}`);

    const isOtpValid = await this.otpService.validateOtp({
      phoneNumber,
      otp,
      context,
    });

    if (!isOtpValid) {
      this.logger.warn(`OTP validation rejected for context: ${context}`);
      throw new UnauthorizedException('wrong credentials.');
    }

    let userToSignIn: Omit<User, 'password' | 'hashedRt'>;
    const userExist = await this.userService.findOneByPhoneNumber(phoneNumber);

    if (!userExist) {
      this.logger.log(`Creating user from OTP validation context: ${context}`);
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

    this.logger.log(`OTP validation completed for user: ${userToSignIn.id}`);
    return {
      ...tokens,
      ...userToSignIn,
    };
  }

  async sendMonitoringAccessOtp({
    phoneNumber,
    context,
    userId,
  }: {
    phoneNumber: string;
    context?: OtpContext;
    userId: string;
  }) {
    this.logger.log(`Monitoring access OTP request for user: ${userId}`);

    const existUser = await this.userService.findOneById(userId);

    if (!existUser || existUser.phoneNumber !== phoneNumber) {
      this.logger.warn(
        `Monitoring access OTP request rejected for user: ${userId}`,
      );
      throw new UnauthorizedException('wrong credentials.');
    }

    const otp = await this.otpService.createAndOverwrite({
      length: 6,
      phoneNumber,
      context: 'MONITORING_ACCESS',
    });

    this.logger.log(`Monitoring access OTP created for user: ${userId}`);
    return { otp: otp.otp };
  }

  async verifyMonitoringAccessOtp({
    otp,
    phoneNumber,
    context,
    userId,
  }: {
    userId: string;
    phoneNumber: string;
    otp: string;
    context: OtpContext;
  }) {
    this.logger.log(`Monitoring access OTP verification attempt: ${userId}`);

    const isOtpValid = await this.otpService.validateOtp({
      phoneNumber,
      otp,
      context: 'MONITORING_ACCESS',
    });

    if (!isOtpValid) {
      this.logger.warn(
        `Monitoring access OTP verification rejected, invalid OTP: ${userId}`,
      );
      throw new UnauthorizedException('wrong credentials.');
    }

    const userExist = await this.userService.findOneByPhoneNumber(phoneNumber);

    if (!userExist || userId !== userExist.id) {
      this.logger.warn(
        `Monitoring access OTP verification rejected, user mismatch: ${userId}`,
      );
      throw new UnauthorizedException('wrong credentials.');
    }

    const monitoringAccessToken = await this.createMonitoringAccessToken(
      userExist.id,
    );

    await this.otpService.remove(otp);

    this.logger.log(`Monitoring access token created for user: ${userExist.id}`);
    return {
      monitoringAccessToken,
    };
  }

  private async createMonitoringAccessToken(userId: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        purpose: 'MONITORING_ACCESS',
      },
      {
        secret: this.config.get('app', { infer: true }).jwt
          .monitoringAccessSecret,
        // expiresIn: 60 * 1, // 1 minutes
        expiresIn: this.config.get('app', { infer: true })?.jwt
          ?.monitoringAccessExpiresIn,
        // expiresIn: 60 * 60, // 60 minutes
      },
    );
  }

  private async createTokens({ userId }: { userId: string }): Promise<Tokens> {
    const accessTokenPromise = this.jwtService.signAsync(
      {
        sub: userId,
      },
      {
        secret: this.config.get('app', { infer: true }).jwt.accessSecret,
        // expiresIn: 60 * 1, // 1 minutes
        expiresIn: this.config.get('app', { infer: true })?.jwt
          ?.accessExpiresIn,
        // expiresIn: 60 * 60, // 60 minutes
      },
    );

    const refreshTokenPromise = this.jwtService.signAsync(
      {
        sub: userId,
      },
      {
        secret: this.config.get('app', { infer: true }).jwt.refreshSecret,
        // expiresIn: 60 * 5, // 5 minutes
        expiresIn: this.config.get('app', { infer: true })?.jwt
          ?.refreshExpiresIn,
        // expiresIn: 60 * 60 * 24 * 7, // a week
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
