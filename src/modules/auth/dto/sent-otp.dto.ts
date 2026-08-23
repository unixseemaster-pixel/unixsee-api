import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

import { toEnglishDigits } from '#/utils/helpers.js';
import { OtpContext } from '#/generated/prisma/enums.js';

export class SendOtpDto {
  @ValidateIf((o: SendOtpDto) => !o.email)
  @IsString()
  @Transform(({ obj }) => {
    if (obj?.phoneNumber == null || obj.phoneNumber === '') {
      return obj?.phoneNumber;
    }
    return toEnglishDigits(obj.phoneNumber);
  })
  @IsMobilePhone()
  phoneNumber?: string;

  @ValidateIf((o: SendOtpDto) => !o.phoneNumber)
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string;

  @IsString()
  @IsEnum(OtpContext)
  context!: OtpContext;
}
