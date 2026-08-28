import { Transform } from 'class-transformer';
import { IsEnum, IsString } from 'class-validator';

import {
  IsInternationalPhone,
  TransformToE164Phone,
} from '#/common/validation/is-international-phone.decorator.js';
import { OtpContext } from '#/generated/prisma/enums.js';
import { toEnglishDigits } from '#/utils/digits.js';

export class ValidateMonitoringAccessOtpDto {
  @Transform(({ obj }) => {
    const englishDigits = toEnglishDigits(obj?.phoneNumber);
    return englishDigits;
  })
  @TransformToE164Phone()
  @IsString()
  @IsInternationalPhone()
  phoneNumber!: string;

  @IsString()
  @Transform(({ obj }) => {
    const englishDigits = toEnglishDigits(obj?.otp);
    return englishDigits;
  })
  otp!: string;

  @IsString()
  @IsEnum([OtpContext.MONITORING_ACCESS])
  context!: 'MONITORING_ACCESS';
}
