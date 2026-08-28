import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

import {
  IsInternationalPhone,
  TransformToE164Phone,
} from '#/common/validation/is-international-phone.decorator.js';
import { OtpContext } from '#/generated/prisma/enums.js';
import { toEnglishDigits } from '#/utils/digits.js';

export class SendOtpDto {
  @ValidateIf((o: SendOtpDto) => !o.email)
  @Transform(({ obj }) => {
    if (obj?.phoneNumber == null || obj.phoneNumber === '') {
      return obj?.phoneNumber;
    }
    return toEnglishDigits(obj.phoneNumber);
  })
  @TransformToE164Phone()
  @IsString()
  @IsInternationalPhone()
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
