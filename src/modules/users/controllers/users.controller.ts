import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UsersService } from '../services/users.service.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';

class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;
}

class RequestPhoneVerifyOtpDto {
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phoneNumber!: string;
}

class VerifyPhoneOtpDto {
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phoneNumber!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(8)
  otp!: string;
}

class RequestEmailVerifyOtpDto {
  @IsEmail()
  email!: string;
}

class VerifyEmailOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(8)
  otp!: string;
}

@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: CurrentUserType) {
    return ApiResponseBuilder.ok(user);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @CurrentUser() user: CurrentUserType,
    @Body() body: UpdateMeDto,
  ) {
    const updated = await this.usersService.updateMe(user.id, body);
    return ApiResponseBuilder.ok(updated);
  }

  @Post('me/contacts/phone/otp/request')
  @HttpCode(HttpStatus.OK)
  async requestPhoneVerifyOtp(
    @CurrentUser() user: CurrentUserType,
    @Body() body: RequestPhoneVerifyOtpDto,
  ) {
    const result = await this.usersService.requestPhoneVerifyOtp(
      user.id,
      body.phoneNumber,
    );
    return ApiResponseBuilder.ok(result);
  }

  @Post('me/contacts/phone/otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneOtp(
    @CurrentUser() user: CurrentUserType,
    @Body() body: VerifyPhoneOtpDto,
  ) {
    const updated = await this.usersService.verifyPhoneOtp(user.id, body);
    return ApiResponseBuilder.ok(updated);
  }

  @Post('me/contacts/email/otp/request')
  @HttpCode(HttpStatus.OK)
  async requestEmailVerifyOtp(
    @CurrentUser() user: CurrentUserType,
    @Body() body: RequestEmailVerifyOtpDto,
  ) {
    const result = await this.usersService.requestEmailVerifyOtp(
      user.id,
      body.email,
    );
    return ApiResponseBuilder.ok(result);
  }

  @Post('me/contacts/email/otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmailOtp(
    @CurrentUser() user: CurrentUserType,
    @Body() body: VerifyEmailOtpDto,
  ) {
    const updated = await this.usersService.verifyEmailOtp(user.id, body);
    return ApiResponseBuilder.ok(updated);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: CurrentUserType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updated = await this.usersService.uploadAvatar(user.id, file);
    return ApiResponseBuilder.ok(updated);
  }
}
