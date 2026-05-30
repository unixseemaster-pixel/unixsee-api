import {
  Body,
  Controller,
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
import { RefreshTokenDto } from '../dto/refresh-token.dto.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import { SendOtpDto } from '../dto/sent-otp.dto.js';
import { ValidateOtpDto } from '../dto/validate-otp.dto.js';

@Controller('v1/auth')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  @Public()
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register({ ...body });
  }

  @Public()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login({ ...body });
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: CurrentUserType,
    @Body() body: RefreshTokenDto,
  ) {
    if (user.refreshToken !== body.refreshToken) {
      return new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    const tokens = await this.authService.refresh(user.sub, body.refreshToken);
    return tokens;
  }

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp({
      phoneNumber: body.phoneNumber,
      context: 'LOGIN',
    });
  }

  @Public()
  @Post('otp/validate')
  @HttpCode(HttpStatus.OK)
  async validateOtp(@Body() body: ValidateOtpDto) {
    return this.authService.sendOtp({
      phoneNumber: body.phoneNumber,
      context: 'LOGIN',
    });
  }
}
