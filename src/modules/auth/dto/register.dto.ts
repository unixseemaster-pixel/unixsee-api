import { VALIDATE_PHONE_NUMBER_REGEX } from '#/utils/constants.js';
import { toEnglishDigits } from '#/utils/helpers.js';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsMobilePhone,
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

  @IsString()
  @Transform(({ obj }) => {
    const englishDigits = toEnglishDigits(obj?.phoneNumber);
    return englishDigits;
  })
  @IsMobilePhone()
  phoneNumber!: string;
}
