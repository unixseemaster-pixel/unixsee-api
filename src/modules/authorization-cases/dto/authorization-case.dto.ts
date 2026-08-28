import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  IsInternationalPhone,
  TransformToE164Phone,
} from '#/common/validation/is-international-phone.decorator.js';
import { ContactChallengeState } from '#/generated/prisma/enums.js';

export const CONTACT_CHALLENGE_API = [
  'unverified',
  'pending',
  'verified',
  'skipped_already_verified',
] as const;

export type ContactChallengeApi = (typeof CONTACT_CHALLENGE_API)[number];

const CHALLENGE_TO_ENUM: Record<ContactChallengeApi, ContactChallengeState> = {
  unverified: ContactChallengeState.UNVERIFIED,
  pending: ContactChallengeState.PENDING,
  verified: ContactChallengeState.VERIFIED,
  skipped_already_verified: ContactChallengeState.SKIPPED_ALREADY_VERIFIED,
};

export function toContactChallengeEnum(
  value: ContactChallengeApi,
): ContactChallengeState {
  return CHALLENGE_TO_ENUM[value];
}

export class AuthorizationPackageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  nationalId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  birthDate!: string;

  @TransformToE164Phone()
  @IsString()
  @IsInternationalPhone()
  mobile!: string;

  @IsIn(CONTACT_CHALLENGE_API)
  mobileChallenge!: ContactChallengeApi;

  @IsBoolean()
  mobileBelongsToNationalId!: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  email!: string;

  @IsIn(CONTACT_CHALLENGE_API)
  emailChallenge!: ContactChallengeApi;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  province!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  city!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  postalCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nationalIdCardFileName?: string | null;

  @IsBoolean()
  attestedTruthful!: boolean;
}

export class SaveAuthorizationDraftDto extends AuthorizationPackageDto {}

export class SubmitAuthorizationDto extends AuthorizationPackageDto {}

export class NeedsMoreInfoAuthorizationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  fieldsToFix!: string[];
}

export class RejectAuthorizationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;
}

export function toPackageInput(dto: AuthorizationPackageDto) {
  return {
    nationalId: dto.nationalId,
    birthDate: dto.birthDate,
    mobile: dto.mobile,
    mobileChallenge: toContactChallengeEnum(dto.mobileChallenge),
    mobileBelongsToNationalId: dto.mobileBelongsToNationalId,
    email: dto.email,
    emailChallenge: toContactChallengeEnum(dto.emailChallenge),
    province: dto.province,
    city: dto.city,
    address: dto.address,
    postalCode: dto.postalCode,
    nationalIdCardFileName: dto.nationalIdCardFileName,
    attestedTruthful: dto.attestedTruthful,
  };
}
