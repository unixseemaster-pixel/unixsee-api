import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
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

export const CONTACT_MESSAGE_SUBJECTS = [
  'managedServer',
  'migrationOptimization',
  'woocommerceSupport',
  'seo',
  'graphicDesign',
  'productDataEntry',
  'socialMedia',
] as const;

export type ContactMessageSubjectValue =
  (typeof CONTACT_MESSAGE_SUBJECTS)[number];

export class CreatePublicContactMessageDto {
  @IsIn(CONTACT_MESSAGE_SUBJECTS)
  subject!: ContactMessageSubjectValue;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @TransformToE164Phone()
  @IsString()
  @IsInternationalPhone()
  phone!: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(200)
  activityBasin?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(512, { each: true })
  @Type(() => String)
  attachmentKeys?: string[];

  @IsOptional()
  @IsIn(['fa', 'en'])
  locale?: 'fa' | 'en';

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(80)
  source?: string;
}
