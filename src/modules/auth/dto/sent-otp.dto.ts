import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsMobilePhone,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

import { toEnglishDigits } from '#/utils/helpers.js';
import { OtpContext } from '#/generated/prisma/enums.js';

export class SendOtpDto {
  @IsString()
  @Transform(({ obj }) => {
    const englishDigits = toEnglishDigits(obj?.phoneNumber);
    return englishDigits;
  })
  @IsMobilePhone()
  phoneNumber!: string;

  @IsString()
  @IsEnum(OtpContext)
  context!: OtpContext;

  @IsString()
  @Transform(({ obj }) => {
    const englishDigits = toEnglishDigits(obj?.otp);
    return englishDigits;
  })
  @MinLength(6)
  otp!: string;
}
