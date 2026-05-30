import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsMobilePhone,
  IsNumberString,
  IsString,
} from 'class-validator';

import { toEnglishDigits } from '#/utils/helpers.js';
import { OtpContext } from '#/generated/prisma/enums.js';

export class ValidateOtpDto {
  @IsString()
  @Transform(({ obj }) => {
    const englishDigits = toEnglishDigits(obj?.phoneNumber);
    return englishDigits;
  })
  @IsMobilePhone()
  phoneNumber!: string;

  @IsString()
  @Transform(({ obj }) => {
    const englishDigits = toEnglishDigits(obj?.otp);
    return englishDigits;
  })
  otp!: string;

  @IsString()
  @IsEnum(OtpContext)
  context!: OtpContext;
}
