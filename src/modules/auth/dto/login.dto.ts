import { VALIDATE_PHONE_NUMBER_REGEX } from '#/utils/constants.js';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  // @MinLength(8)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(VALIDATE_PHONE_NUMBER_REGEX, {
    message: 'Invalid phone number.',
  })
  phoneNumber?: string;
}
