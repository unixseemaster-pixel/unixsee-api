import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

import {
  IsInternationalPhone,
  TransformToE164Phone,
} from '#/common/validation/is-international-phone.decorator.js';
import { OtpContext } from '#/generated/prisma/enums.js';
import { toEnglishDigits } from '#/utils/digits.js';
import { ExactlyOneOtpTarget } from './exactly-one-otp-target.validator.js';

/**
 * Body of `POST v1/auth/otp/verify`.
 *
 * Exactly one target: `@IsOptional()` means a field that *is* supplied is
 * always format-checked, and {@link ExactlyOneOtpTarget} rejects both-present
 * and neither-present. Both halves matter — the previous
 * `@ValidateIf((o) => !o.email)` pairing switched each field's checks off as
 * soon as the other was present, so a body carrying both got no validation on
 * either while `whitelist` still forwarded both to the service.
 */
export class ValidateOtpDto {
  @IsOptional()
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

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string;

  @IsString()
  @Transform(({ obj }) => {
    const englishDigits = toEnglishDigits(obj?.otp);
    return englishDigits;
  })
  otp!: string;

  // The one-target rule hangs off `context` because it is the only always
  // validated property here; see the decorator's own note.
  @ExactlyOneOtpTarget()
  @IsString()
  @IsEnum(OtpContext)
  context!: OtpContext;
}
