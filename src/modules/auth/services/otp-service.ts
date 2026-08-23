import { Otp, OtpContext } from '#/generated/prisma/client.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import type { AppConfigType } from '#/utils/config/app.config.js';
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createAppLogger } from '#/common/logging/app-logger.js';

interface SaveOtpToDbParams {
  otp: string;
  phoneNumber: string;
  context?: OtpContext;
}

interface CreateOtpParams {
  length: number;
  phoneNumber: string;
  context?: OtpContext;
}

interface CreateOtpByIdentifierParams {
  length: number;
  identifier: string;
  context?: OtpContext;
}

@Injectable()
export class OtpService {
  private readonly logger = createAppLogger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfigType, true>,
  ) {}

  remove(otp: string) {
    return this.prisma.otp.delete({
      where: { otp },
    });
  }

  async createAndOverwrite({
    length,
    phoneNumber,
    context = 'LOGIN',
  }: CreateOtpParams): Promise<Otp> {
    this.logger.debug('otp.create_or_overwrite.started', {
      context,
      phoneNumber,
      length,
    });

    try {
      const otpCode = this.createCode(length);
      const existOtp = await this.prisma.otp.findUnique({
        where: {
          phoneNumber,
          context,
        },
      });

      this.logger.debug('otp.existing_lookup.completed', {
        context,
        phoneNumber,
        found: Boolean(existOtp),
      });

      const appConfig = this.config.get('app', { infer: true });
      const expTime = appConfig.otpExpiredTime;
      const retryTime = appConfig.otpRetryTime;

      if (existOtp) {
        const retryAllowed = existOtp.lastRequestedTime
          ? this.isRetryAllowed(existOtp.lastRequestedTime, retryTime)
          : true;

        if (retryAllowed !== true) {
          const minText =
            retryAllowed.minutes > 0
              ? `${retryAllowed.minutes}minutes and`
              : '';
          const secText =
            retryAllowed.seconds > 0 ? `${retryAllowed.seconds} seconds` : '';

          this.logger.warn('otp.retry.rejected', {
            context,
            phoneNumber,
            wait: `${minText} ${secText}`.trim(),
          });
          throw new HttpException(
            `Please wait ${minText} ${secText}`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const updatedOtp = await this.prisma.otp.update({
          where: {
            phoneNumber: existOtp.phoneNumber || undefined,
            context,
          },
          data: {
            otp: otpCode,
            expiredTime: this.createExpiredDateByMinute(expTime),
            lastRequestedTime: new Date(),
          },
        });

        this.logger.log('otp.updated', {
          context,
          otpId: updatedOtp.id,
        });

        return updatedOtp;
      }

      const createdOtp = await this.prisma.otp.create({
        data: {
          otp: otpCode,
          phoneNumber,
          expiredTime: this.createExpiredDateByMinute(expTime),
          lastRequestedTime: new Date(),
          ...(context && { context }),
        },
      });

      this.logger.log('otp.created', {
        context,
        otpId: createdOtp.id,
      });

      return createdOtp;
    } catch (error) {
      this.logger.error('otp.create_or_overwrite.failed', error as Error, {
        context,
        phoneNumber,
      });
      throw error;
    }
  }

  async create({ length, phoneNumber }: CreateOtpParams): Promise<Otp> {
    const expTime = this.config.get('app', { infer: true }).otpExpiredTime;
    try {
      const otpCode = this.createCode(length);

      const createdOtp = await this.prisma.otp.create({
        data: {
          otp: otpCode,
          phoneNumber,
          expiredTime: this.createExpiredDateByMinute(expTime),
        },
      });

      this.logger.log('otp.created', { otpId: createdOtp.id, phoneNumber });
      return createdOtp;
    } catch (error) {
      this.logger.error('otp.create.failed', error as Error, { phoneNumber });
      throw new HttpException('Something went wrong.', 500);
    }
  }

  async saveToDb({ otp, phoneNumber }: SaveOtpToDbParams) {
    const expTime = this.config.get('app', { infer: true }).otpExpiredTime;
    try {
      await this.prisma.otp.create({
        data: {
          phoneNumber,
          otp,
          expiredTime: this.createExpiredDateByMinute(expTime),
        },
      });

      this.logger.log('otp.saved', { phoneNumber });
      return { status: 'success' };
    } catch (error) {
      this.logger.error('otp.save.failed', error as Error, { phoneNumber });
      throw new HttpException('Something went wrong.', 500);
    }
  }

  async validateOtp({
    otp,
    phoneNumber,
    context = 'LOGIN',
  }: SaveOtpToDbParams) {
    const existOtp = await this.prisma.otp.findFirst({
      where: {
        phoneNumber,
        otp,
        context,
      },
    });

    if (!existOtp || this.isOtpExpired(existOtp.expiredTime)) {
      this.logger.warn('otp.validation.rejected', {
        context,
        phoneNumber,
        reason: !existOtp ? 'not_found' : 'expired',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (existOtp.phoneNumber !== phoneNumber || existOtp.otp !== otp) {
      this.logger.warn('otp.validation.rejected', {
        context,
        phoneNumber,
        reason: 'mismatch',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.debug('otp.validation.accepted', { context, phoneNumber });
    return true;
  }

  async validateOtpByIdentifier({
    identifier,
    otp,
    context = 'EMAIL_VERIFY',
  }: {
    identifier: string;
    otp: string;
    context?: OtpContext;
  }) {
    const existOtp = await this.prisma.otp.findFirst({
      where: {
        identifier,
        otp,
        context,
      },
    });

    if (!existOtp || this.isOtpExpired(existOtp.expiredTime)) {
      this.logger.warn('otp.identifier_validation.rejected', {
        identifier,
        context,
        reason: !existOtp ? 'not_found' : 'expired',
      });
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (existOtp.identifier !== identifier || existOtp.otp !== otp) {
      this.logger.warn('otp.identifier_validation.rejected', {
        identifier,
        context,
        reason: 'mismatch',
      });
      throw new UnauthorizedException('Invalid credentials.');
    }

    this.logger.debug('otp.identifier_validation.accepted', {
      identifier,
      context,
    });
    return true;
  }

  async createAndOverwriteByIdentifier({
    length,
    identifier,
    context = 'EMAIL_VERIFY',
  }: CreateOtpByIdentifierParams): Promise<Otp> {
    this.logger.debug('otp.identifier.create_or_overwrite.started', {
      context,
      identifier,
      length,
    });

    try {
      const otpCode = this.createCode(length);
      const existOtp = await this.prisma.otp.findUnique({
        where: { identifier },
      });

      const appConfig = this.config.get('app', { infer: true });
      const expTime = appConfig.otpExpiredTime;
      const retryTime = appConfig.otpRetryTime;

      if (existOtp) {
        const retryAllowed = existOtp.lastRequestedTime
          ? this.isRetryAllowed(existOtp.lastRequestedTime, retryTime)
          : true;

        if (retryAllowed !== true) {
          const minText =
            retryAllowed.minutes > 0
              ? `${retryAllowed.minutes}minutes and`
              : '';
          const secText =
            retryAllowed.seconds > 0 ? `${retryAllowed.seconds} seconds` : '';

          this.logger.warn('otp.identifier.retry.rejected', {
            context,
            identifier,
            wait: `${minText} ${secText}`.trim(),
          });
          throw new HttpException(
            `Please wait ${minText} ${secText}`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const updatedOtp = await this.prisma.otp.update({
          where: { identifier },
          data: {
            otp: otpCode,
            context,
            expiredTime: this.createExpiredDateByMinute(expTime),
            lastRequestedTime: new Date(),
          },
        });

        this.logger.log('otp.identifier.updated', {
          context,
          otpId: updatedOtp.id,
        });

        return updatedOtp;
      }

      const createdOtp = await this.prisma.otp.create({
        data: {
          otp: otpCode,
          identifier,
          context,
          expiredTime: this.createExpiredDateByMinute(expTime),
          lastRequestedTime: new Date(),
        },
      });

      this.logger.log('otp.identifier.created', {
        context,
        otpId: createdOtp.id,
      });

      return createdOtp;
    } catch (error) {
      this.logger.error(
        'otp.identifier.create_or_overwrite.failed',
        error as Error,
        {
          context,
          identifier,
        },
      );
      throw error;
    }
  }

  private createCode(length: number): string {
    let otpCode = '';

    for (let i = 0; i < length; i++) {
      const digit = Math.floor(Math.random() * 10);
      otpCode += digit;
    }
    return otpCode;
  }

  private createExpiredDateByMinute(minute: number): Date {
    const currentDate = new Date();
    currentDate.setMinutes(currentDate.getMinutes() + minute);

    return currentDate;
  }

  private isOtpExpired(otpDate: Date) {
    const currentDate = new Date();
    return currentDate > otpDate;
  }

  private isRetryAllowed(
    lastRequestedTime: Date,
    retryTime: number,
  ): true | { minutes: number; seconds: number } {
    const now = new Date();
    const retryDate = new Date(lastRequestedTime);
    retryDate.setMinutes(retryDate.getMinutes() + retryTime);

    if (now > retryDate) {
      return true;
    }

    // remaining time
    const diffMs = retryDate.getTime() - now.getTime();
    const minutes = Math.floor(diffMs / 1000 / 60);
    const seconds = Math.floor((diffMs / 1000) % 60);

    return { minutes, seconds };
  }
}
