import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthenticationService } from '../services/authentication.service.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { RtGuard } from '../guards/rt-guard.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import type { CurrentUserType } from '#/@types/express/index.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import { SendOtpDto } from '../dto/sent-otp.dto.js';
import { ValidateOtpDto } from '../dto/validate-otp.dto.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { RateLimit } from '#/common/rate-limit/rate-limit.decorator.js';
import { RateLimitGuard } from '#/common/rate-limit/rate-limit.guard.js';
import { SendMonitoringAccessOtpDto } from '../dto/sent-monitoring-access-otp.dto.js';
import { ValidateMonitoringAccessOtpDto } from '../dto/validate-monitoring-access-otp.dto.js';
import {
  AUTHENTICATED_OTP_REQUEST_RATE_LIMITS,
  AUTHENTICATED_OTP_VERIFY_RATE_LIMITS,
  OTP_REQUEST_RATE_LIMITS,
  OTP_VERIFY_RATE_LIMITS,
} from '../otp-rate-limits.js';

@Controller('v1/auth')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    const data = await this.authService.register({ ...body });
    return ApiResponseBuilder.ok(data);
  }

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    const data = await this.authService.login({ ...body });
    return ApiResponseBuilder.ok(data);
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: CurrentUserType) {
    if (!user?.refreshToken) {
      return new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const tokens = await this.authService.refresh(user.sub, user.refreshToken);

    return ApiResponseBuilder.ok(tokens);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('sub') userId: CurrentUserType['sub']) {
    const response = await this.authService.logout(userId);

    return ApiResponseBuilder.ok(response);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit(...OTP_REQUEST_RATE_LIMITS)
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: SendOtpDto) {
    const response = await this.authService.sendOtp({
      phoneNumber: body.phoneNumber,
      email: body.email,
      context: 'LOGIN',
    });

    return ApiResponseBuilder.ok(response);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit(...OTP_VERIFY_RATE_LIMITS)
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async validateOtp(@Body() body: ValidateOtpDto) {
    const response = await this.authService.validateOtp({
      phoneNumber: body.phoneNumber,
      email: body.email,
      context: body.context,
      otp: body.otp,
    });

    return ApiResponseBuilder.ok(response);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit(...AUTHENTICATED_OTP_REQUEST_RATE_LIMITS)
  @Post('otp/monitoring-access/request')
  @HttpCode(HttpStatus.OK)
  async sendMonitoringAccessOtp(
    @CurrentUser('sub') userId: string,
    @Body() body: SendMonitoringAccessOtpDto,
  ) {
    const response = await this.authService.sendMonitoringAccessOtp({
      userId,
      phoneNumber: body.phoneNumber,
      context: 'MONITORING_ACCESS',
    });

    return ApiResponseBuilder.ok(response);
  }

  @UseGuards(RateLimitGuard)
  @RateLimit(...AUTHENTICATED_OTP_VERIFY_RATE_LIMITS)
  @Post('otp/monitoring-access/verify')
  @HttpCode(HttpStatus.OK)
  async validateMonitoringAccessOtp(
    @CurrentUser('sub') userId: string,
    @Body() body: ValidateMonitoringAccessOtpDto,
  ) {
    const response = await this.authService.verifyMonitoringAccessOtp({
      userId,
      phoneNumber: body.phoneNumber,
      context: 'MONITORING_ACCESS',
      otp: body.otp,
    });

    return ApiResponseBuilder.ok(response);
  }
}
