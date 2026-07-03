import {
  BadRequestException,
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
import { OtpContext } from '#/generated/prisma/enums.js';
import { User } from '#/generated/prisma/client.js';
import { OtpService } from './otp-service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import { RequestContext } from '#/common/logging/request-context.js';

@Injectable()
export class AuthenticationService {
  private readonly logger = createAppLogger(AuthenticationService.name);

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
    this.logger.log('auth.register.attempt', { username, email, phoneNumber });

    const user = await this.userService.findOneByUsername({ username });

    if (user) {
      this.logger.warn('auth.register.rejected_user_exists', { username });
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

    const tokens = await this.createTokens({ userId: createdUser.id });
    RequestContext.setUserId(createdUser.id);
    this.logger.log('auth.register.completed', { userId: createdUser.id });
    return tokens;
  }

  async login({ password, username, email, phoneNumber }: LoginDto) {
    this.logger.log('auth.login.attempt', { username, email, phoneNumber });

    const existUser = await this.userService.findOneByUsername({ username });
    if (!existUser) {
      this.logger.warn('auth.login.rejected_user_not_found', { username });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    if (!existUser?.password) {
      this.logger.warn('auth.login.rejected_password_not_set', {
        userId: existUser.id,
      });
      throw new BadRequestException(
        "You didn't set password for your account.",
      );
    }

    const isPassCorrect = await bcrypt.compare(password, existUser.password);

    if (!isPassCorrect) {
      this.logger.warn('auth.login.rejected_invalid_password', {
        userId: existUser.id,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const tokens = await this.createTokens({ userId: existUser.id });

    RequestContext.setUserId(existUser.id);
    this.logger.log('auth.login.completed', { userId: existUser.id });
    return tokens;
  }

  async refresh(userId: string, refreshToken: string) {
    RequestContext.setUserId(userId);
    this.logger.log('auth.refresh.attempt', { userId });

    const user = await this.userService.findOneById(userId);
    if (!user || !user.hashedRt) {
      this.logger.warn('auth.refresh.rejected_missing_hash', { userId });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const isRtValid = await bcrypt.compare(refreshToken, user.hashedRt);
    if (!isRtValid) {
      this.logger.warn('auth.refresh.rejected_invalid_token', { userId });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    this.logger.log('auth.refresh.completed', { userId: user.id });
    return this.createTokens({ userId: user.id });
  }

  async logout(userId: string) {
    RequestContext.setUserId(userId);
    this.logger.log('auth.logout.attempt', { userId });

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

    this.logger.log('auth.logout.completed', { userId });
    return user;
  }

  async sendOtp({
    phoneNumber,
    context,
  }: {
    phoneNumber: string;
    context?: OtpContext;
  }) {
    const resolvedContext = context ?? 'LOGIN';
    this.logger.log('auth.otp.requested', {
      context: resolvedContext,
      phoneNumber,
    });

    try {
      const otp = await this.otpService.createAndOverwrite({
        length: 6,
        phoneNumber,
        context,
      });

      this.logger.log('auth.otp.created', {
        context: resolvedContext,
        otpId: otp.id,
      });
      return { otp: otp.otp };
    } catch (error) {
      this.logger.error('auth.otp.create_failed', error as Error, {
        context: resolvedContext,
        phoneNumber,
      });
      throw error;
    }
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
    this.logger.log('auth.otp.validation_attempt', { context, phoneNumber });

    const isOtpValid = await this.otpService.validateOtp({
      phoneNumber,
      otp,
      context,
    });

    if (!isOtpValid) {
      this.logger.warn('auth.otp.validation_rejected', {
        context,
        phoneNumber,
      });
      throw new UnauthorizedException('wrong credentials.');
    }

    let userToSignIn: Omit<User, 'password' | 'hashedRt'>;
    const userExist = await this.userService.findOneByPhoneNumber(phoneNumber);

    if (!userExist) {
      this.logger.log('auth.otp.creating_user', { context, phoneNumber });
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

    RequestContext.setUserId(userToSignIn.id);
    this.logger.log('auth.otp.validation_completed', {
      userId: userToSignIn.id,
      context,
    });
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
    RequestContext.setUserId(userId);
    this.logger.log('auth.monitoring_otp.requested', { userId, phoneNumber });

    const existUser = await this.userService.findOneById(userId);

    if (!existUser || existUser.phoneNumber !== phoneNumber) {
      this.logger.warn('auth.monitoring_otp.rejected_user_mismatch', {
        userId,
      });
      throw new UnauthorizedException('wrong credentials.');
    }

    const otp = await this.otpService.createAndOverwrite({
      length: 6,
      phoneNumber,
      context: 'MONITORING_ACCESS',
    });

    this.logger.log('auth.monitoring_otp.created', { userId, otpId: otp.id });
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
    RequestContext.setUserId(userId);
    this.logger.log('auth.monitoring_otp.verify_attempt', { userId });

    const isOtpValid = await this.otpService.validateOtp({
      phoneNumber,
      otp,
      context: 'MONITORING_ACCESS',
    });

    if (!isOtpValid) {
      this.logger.warn('auth.monitoring_otp.rejected_invalid_code', { userId });
      throw new UnauthorizedException('wrong credentials.');
    }

    const userExist = await this.userService.findOneByPhoneNumber(phoneNumber);

    if (!userExist || userId !== userExist.id) {
      this.logger.warn('auth.monitoring_otp.rejected_user_mismatch', {
        userId,
      });
      throw new UnauthorizedException('wrong credentials.');
    }

    const monitoringAccessToken = await this.createMonitoringAccessToken(
      userExist.id,
    );

    await this.otpService.remove(otp);

    this.logger.log('auth.monitoring_access.created', {
      userId: userExist.id,
    });
    const serverTimeInSeconds = Math.floor(Date.now() / 1000);
    return {
      monitoringAccessToken,
      serverTimeInSeconds,
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

    const serverTimeInSeconds = Math.floor(Date.now() / 1000);

    return { accessToken, refreshToken, serverTimeInSeconds };
  }

  private hashData(data: string) {
    return bcrypt.hash(data, 12);
  }
}
