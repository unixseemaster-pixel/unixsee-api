import { Otp, OtpContext } from '#/generated/prisma/client.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { AppConfigType } from '#/utils/config/app.config.js';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SaveOtpToDbParams {
  otp: string;
  phoneNumber: string;
  context?: OtpContext;
}

// interface CreateOtpWithIdParams {
//   length: number;
//   identifier: string;
// }

interface CreateOtpParams {
  length: number;
  phoneNumber: string;
  context?: OtpContext;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

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
    this.logger.log(
      `createAndOverwrite started, context: ${context}, phoneNumber: ${phoneNumber}, length: ${length}`,
    );

    try {
      const otpCode = this.createCode(length);
      this.logger.log(`OTP code generated, context: ${context}`);

      this.logger.log(
        `Searching existing OTP, context: ${context}, phoneNumber: ${phoneNumber}`,
      );
      const existOtp = await this.prisma.otp.findUnique({
        where: {
          phoneNumber,
          context,
        },
      });
      this.logger.log(
        `Existing OTP lookup completed, context: ${context}, found: ${Boolean(existOtp)}`,
      );

      const appConfig = this.config.get('app', { infer: true });
      const expTime = appConfig.otpExpiredTime;
      const retryTime = appConfig.otpRetryTime;
      this.logger.log(
        `OTP config loaded, context: ${context}, expTime: ${expTime}, retryTime: ${retryTime}`,
      );

      if (existOtp) {
        this.logger.log(
          `Existing OTP found, context: ${context}, otpId: ${existOtp.id}, lastRequestedTime: ${existOtp.lastRequestedTime?.toISOString() ?? 'NULL'}`,
        );
        const retryAllowed = existOtp.lastRequestedTime
          ? this.isRetryAllowed(existOtp.lastRequestedTime, retryTime)
          : true;
        this.logger.log(
          `Retry check completed, context: ${context}, retryAllowed: ${JSON.stringify(retryAllowed)}`,
        );

        if (retryAllowed !== true) {
          const minText =
            retryAllowed.minutes > 0
              ? `${retryAllowed.minutes}minutes and`
              : '';
          const secText =
            retryAllowed.seconds > 0 ? `${retryAllowed.seconds} seconds` : '';

          this.logger.warn(
            `OTP retry rejected, context: ${context}, phoneNumber: ${phoneNumber}, wait: ${minText} ${secText}`,
          );
          throw new HttpException(
            `Please wait ${minText} ${secText}`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        this.logger.log(
          `Updating existing OTP, context: ${context}, otpId: ${existOtp.id}`,
        );
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
        this.logger.log(
          `Existing OTP updated, context: ${context}, otpId: ${updatedOtp.id}`,
        );

        return updatedOtp;
      }

      this.logger.log(
        `Creating new OTP, context: ${context}, phoneNumber: ${phoneNumber}`,
      );
      const createdOtp = await this.prisma.otp.create({
        data: {
          otp: otpCode,

          phoneNumber: phoneNumber,
          expiredTime: this.createExpiredDateByMinute(expTime),
          lastRequestedTime: new Date(),

          ...(context && { context }),
        },
      });
      this.logger.log(
        `New OTP created, context: ${context}, otpId: ${createdOtp.id}`,
      );

      return createdOtp;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `createAndOverwrite failed, context: ${context}, phoneNumber: ${phoneNumber}, error: ${message}`,
        stack,
      );
      throw error;
    }
  }

  async create({ length, phoneNumber }: CreateOtpParams): Promise<Otp> {
    const expTime = this.config.get('app', { infer: true }).otpExpiredTime;
    try {
      const otpCode = this.createCode(length);

      return this.prisma.otp.create({
        data: {
          otp: otpCode,

          phoneNumber,
          expiredTime: this.createExpiredDateByMinute(expTime),
        },
      });
    } catch (error) {
      throw new HttpException('Something went wrong.', 500);
    }
  }

  async saveToDb({ otp, phoneNumber }: SaveOtpToDbParams) {
    const expTime = this.config.get('app', { infer: true }).otpExpiredTime;
    try {
      const createdOtp = await this.prisma.otp.create({
        data: {
          phoneNumber: phoneNumber,
          otp,
          expiredTime: this.createExpiredDateByMinute(expTime),
        },
      });

      return { status: 'success' };
    } catch (error) {
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

    if (!existOtp || this.isOtpExpired(existOtp.expiredTime))
      throw new UnauthorizedException('Invalid credentials');

    if (existOtp.phoneNumber !== phoneNumber || existOtp.otp !== otp)
      throw new UnauthorizedException('Invalid credentials');

    return true;
  }

  async validateOtpByIdentifier({
    identifier,
    otp,
  }: {
    identifier: string;
    otp: string;
  }) {
    const existOtp = await this.prisma.otp.findFirst({
      where: {
        identifier,
        otp,
      },
    });

    if (!existOtp || this.isOtpExpired(existOtp.expiredTime))
      throw new UnauthorizedException('Invalid credentials.');

    if (existOtp.identifier !== identifier || existOtp.otp !== otp)
      throw new UnauthorizedException('Invalid credentials.');

    return true;
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

  private createRetryDateByMinute(minute: number): Date {
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
