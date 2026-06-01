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

export class SendMonitoringAccessOtpDto {
  @IsString()
  @Transform(({ obj }) => {
    const englishDigits = toEnglishDigits(obj?.phoneNumber);
    return englishDigits;
  })
  @IsMobilePhone()
  phoneNumber!: string;

  @IsString()
  @IsEnum([OtpContext.MONITORING_ACCESS])
  context!: 'MONITORING_ACCESS';
}
