import { Otp, OtpContext } from '#/generated/prisma/client.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { AppConfigType } from '#/utils/config/app.config.js';
import {
  HttpException,
  HttpStatus,
  Injectable,
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
    const otpCode = this.createCode(length);

    const existOtp = await this.prisma.otp.findUnique({
      where: {
        phoneNumber,
        context,
      },
    });

    const expTime = this.config.get('app', { infer: true }).otpExpiredTime;

    const retryTime = this.config.get('app', { infer: true }).otpRetryTime;

    if (existOtp) {
      const retryAllowed = existOtp.lastRequestedTime
        ? this.isRetryAllowed(existOtp.lastRequestedTime, retryTime)
        : true;
      if (retryAllowed !== true) {
        const minText =
          retryAllowed.minutes > 0 ? `${retryAllowed.minutes}minutes and` : '';
        const secText =
          retryAllowed.seconds > 0 ? `${retryAllowed.seconds} seconds` : '';

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

      return updatedOtp;
    }

    return this.prisma.otp.create({
      data: {
        otp: otpCode,

        phoneNumber: phoneNumber,
        expiredTime: this.createExpiredDateByMinute(expTime),
        lastRequestedTime: new Date(),

        ...(context && { context }),
      },
    });
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
