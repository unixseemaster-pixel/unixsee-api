import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

import {
  IsInternationalPhone,
  TransformToE164Phone,
} from '#/common/validation/is-international-phone.decorator.js';

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
  @TransformToE164Phone()
  @IsString()
  @IsInternationalPhone()
  phoneNumber?: string;
}
