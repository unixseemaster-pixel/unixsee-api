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
import { UsersService } from '#/modules/users/services/users.service.js';
import { TenantsService } from '#/modules/tenants/services/tenants.service.js';
import type { AppConfigType } from '#/utils/config/app.config.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import type { LoginDto } from '../dto/login.dto.js';
import type { Tokens } from '../types/tokens.types.js';
import type { RegisterDto } from '../dto/register.dto.js';
import { OtpContext, UserAccountStatus } from '#/generated/prisma/enums.js';
import { User } from '#/generated/prisma/client.js';
import { OtpService } from './otp-service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import { isClientFailure } from '#/common/http/client-failure.js';
import { RequestContext } from '#/common/logging/request-context.js';
import { MailService } from '#/modules/mail/mail.service.js';

@Injectable()
export class AuthenticationService {
  private readonly logger = createAppLogger(AuthenticationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
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

    await this.tenantsService.ensurePersonalTenantForUser(
      createdUser.id,
      fullName ?? username,
    );

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

    if (existUser.status === UserAccountStatus.SUSPENDED) {
      this.logger.warn('auth.login.rejected_suspended', {
        userId: existUser.id,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.suspended);
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
    email,
    context,
  }: {
    phoneNumber?: string;
    email?: string;
    context?: OtpContext;
  }) {
    const resolvedContext = context ?? 'LOGIN';
    const normalizedEmail = email?.trim().toLowerCase();

    if (normalizedEmail) {
      return this.sendEmailLoginOtp({
        email: normalizedEmail,
        context: resolvedContext,
      });
    }

    if (!phoneNumber) {
      throw new BadRequestException('Phone number or email is required.');
    }

    this.logger.log('auth.otp.requested', {
      context: resolvedContext,
      phoneNumber,
    });

    try {
      const issued = await this.otpService.createAndOverwrite({
        length: 6,
        phoneNumber,
        context: resolvedContext,
      });

      // TODO: later opt should be send to users phone/email

      // await this.mailService.sendPhoneOtpMockEmail({
      //   phoneNumber,
      //   otp: issued.code,
      // });

      this.logger.log('auth.otp.created', {
        context: resolvedContext,
        otpId: issued.challenge.id,
      });

      // The code is echoed only so the mocked delivery flow stays usable
      // without an SMS provider. Production never returns it, so a leak here
      // cannot reach real users while the mock remains in place.
      const retryAfterSeconds =
        this.otpService.getConfiguredRetryAfterSeconds();
      return this.isDeliveryMocked()
        ? { delivered: true as const, otp: issued.code, retryAfterSeconds }
        : { delivered: true as const, retryAfterSeconds };
    } catch (error) {
      if (!isClientFailure(error)) {
        this.logger.error('auth.otp.create_failed', error as Error, {
          context: resolvedContext,
          phoneNumber,
        });
      }
      throw error;
    }
  }

  async sendEmailLoginOtp({
    email,
    context,
  }: {
    email: string;
    context: OtpContext;
  }) {
    this.logger.log('auth.otp.email.requested', { context, email });

    try {
      const issued = await this.otpService.createAndOverwriteByIdentifier({
        length: 6,
        identifier: email,
        context,
      });

      await this.mailService.sendEmailOtpMockEmail({
        email,
        otp: issued.code,
      });

      this.logger.log('auth.otp.email.created', {
        context,
        otpId: issued.challenge.id,
      });
      return {
        delivered: true as const,
        retryAfterSeconds: this.otpService.getConfiguredRetryAfterSeconds(),
      };
    } catch (error) {
      if (!isClientFailure(error)) {
        this.logger.error('auth.otp.email.create_failed', error as Error, {
          context,
          email,
        });
      }
      throw error;
    }
  }

  async validateOtp({
    otp,
    phoneNumber,
    email,
    context,
  }: {
    phoneNumber?: string;
    email?: string;
    otp: string;
    context: OtpContext;
  }) {
    const normalizedEmail = email?.trim().toLowerCase();

    if (normalizedEmail) {
      return this.validateEmailLoginOtp({
        email: normalizedEmail,
        otp,
        context,
      });
    }

    if (!phoneNumber) {
      throw new BadRequestException('Phone number or email is required.');
    }

    this.logger.log('auth.otp.validation_attempt', { context, phoneNumber });

    // Verification throws a uniform `OTP_VERIFICATION_FAILED` for every failure
    // — unknown target, wrong code, expired, consumed, attempts exhausted — so
    // there is no falsy result to branch on here.
    await this.otpService.validateOtp({
      phoneNumber,
      otp,
      context,
    });

    let userToSignIn: Omit<User, 'password' | 'hashedRt'>;
    const userExist = await this.userService.findOneByPhoneNumber(phoneNumber);

    if (!userExist) {
      this.logger.log('auth.otp.creating_user', { context, phoneNumber });
      userToSignIn = await this.userService.create({
        phoneNumber,
        role: 'TENANT',
        phoneVerifiedAt: new Date(),
      });
    } else {
      userToSignIn = await this.prisma.user.update({
        where: { id: userExist.id },
        data: { phoneVerifiedAt: new Date() },
        omit: {
          password: true,
          hashedRt: true,
        },
      });
    }

    await this.tenantsService.ensurePersonalTenantForUser(
      userToSignIn.id,
      userToSignIn.fullName ?? undefined,
    );

    const tokens = await this.createTokens({
      userId: userToSignIn.id,
    });

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

  async validateEmailLoginOtp({
    email,
    otp,
    context,
  }: {
    email: string;
    otp: string;
    context: OtpContext;
  }) {
    this.logger.log('auth.otp.email.validation_attempt', { context, email });

    // Rejections surface as a uniform `OTP_VERIFICATION_FAILED` throw.
    await this.otpService.validateOtpByIdentifier({
      identifier: email,
      otp,
      context,
    });

    let userToSignIn: Omit<User, 'password' | 'hashedRt'>;
    const userExist = await this.userService.findOneByEmail(email);

    if (!userExist) {
      this.logger.log('auth.otp.email.creating_user', { context, email });
      userToSignIn = await this.userService.create({
        email,
        role: 'TENANT',
        emailVerifiedAt: new Date(),
      });
    } else {
      userToSignIn = await this.prisma.user.update({
        where: { id: userExist.id },
        data: { emailVerifiedAt: new Date() },
        omit: {
          password: true,
          hashedRt: true,
        },
      });
    }

    await this.tenantsService.ensurePersonalTenantForUser(
      userToSignIn.id,
      userToSignIn.fullName ?? undefined,
    );

    const tokens = await this.createTokens({
      userId: userToSignIn.id,
    });

    RequestContext.setUserId(userToSignIn.id);
    this.logger.log('auth.otp.email.validation_completed', {
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

    await this.mailService.sendPhoneOtpMockEmail({
      phoneNumber,
      otp: otp.code,
    });

    this.logger.log('auth.monitoring_otp.created', {
      userId,
      otpId: otp.challenge.id,
    });
    return {
      delivered: true as const,
      retryAfterSeconds: this.otpService.getConfiguredRetryAfterSeconds(),
    };
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

    // Rejections surface as a uniform `OTP_VERIFICATION_FAILED` throw.
    await this.otpService.validateOtp({
      phoneNumber,
      otp,
      context: 'MONITORING_ACCESS',
    });

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

    await this.userService.updateRtHash({ userId, rt: refreshToken });

    const serverTimeInSeconds = Math.floor(Date.now() / 1000);

    return { accessToken, refreshToken, serverTimeInSeconds };
  }

  /**
   * True while OTP delivery is mocked, i.e. outside production. Gates the
   * development-only echo of the code in the request response; once real SMS and
   * email providers land this helper and the echo go away together.
   */
  private isDeliveryMocked(): boolean {
    return this.config.get('app', { infer: true }).appEnv !== 'production';
  }

  private hashData(data: string) {
    return bcrypt.hash(data, 12);
  }
}
