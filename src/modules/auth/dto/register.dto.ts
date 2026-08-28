import { toEnglishDigits } from '#/utils/digits.js';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

import {
  IsInternationalPhone,
  TransformToE164Phone,
} from '#/common/validation/is-international-phone.decorator.js';

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

  @Transform(({ value }) =>
    typeof value === 'string' ? toEnglishDigits(value) : value,
  )
  @TransformToE164Phone()
  @IsString()
  @IsInternationalPhone()
  phoneNumber!: string;
}
