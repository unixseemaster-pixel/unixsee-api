import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

import { VALIDATE_PHONE_NUMBER_REGEX } from 'src/utils/constants';

export class LoginDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8)
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  fullName?: string;

  @IsOptional()
  @IsNumber()
  @Matches(VALIDATE_PHONE_NUMBER_REGEX, {
    message: 'Invalid phone number.',
  })
  phoneNumber?: string;
}
