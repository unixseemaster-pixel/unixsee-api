import { VALIDATE_PHONE_NUMBER_REGEX } from '#/utils/constants.js';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  // @MinLength(8)
  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(VALIDATE_PHONE_NUMBER_REGEX, {
    message: 'Invalid phone number.',
  })
  phoneNumber?: string;
}
