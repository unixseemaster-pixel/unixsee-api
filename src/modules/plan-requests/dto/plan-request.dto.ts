import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

import {
  IsInternationalPhone,
  TransformToE164Phone,
} from '#/common/validation/is-international-phone.decorator.js';
import {
  BillingCommercialModel,
  BillingCommercialState,
  BillingInterval,
} from '#/generated/prisma/enums.js';

export class CreatePublicPlanRequestDto {
  @IsUUID()
  planId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactName!: string;

  @ValidateIf((o: CreatePublicPlanRequestDto) => !o.contactEmail)
  @TransformToE164Phone()
  @IsString()
  @IsInternationalPhone()
  contactPhone?: string;

  @ValidateIf((o: CreatePublicPlanRequestDto) => !o.contactPhone)
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  websiteDomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

/** Authenticated customer create — same body as public intake. */
export class CreatePlanRequestDto extends CreatePublicPlanRequestDto {}

export class LinkPlanRequestDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  linkedUserId?: string;

  @IsOptional()
  @IsUUID()
  websiteId?: string;
}

export class EnablePlanRequestDto {
  @IsUUID()
  websiteId!: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsEnum(BillingInterval)
  interval!: BillingInterval;

  @IsOptional()
  @IsString()
  periodStartsAt?: string;

  @IsOptional()
  @IsEnum(BillingCommercialModel)
  commercialModel?: BillingCommercialModel;

  @IsOptional()
  @IsEnum(BillingCommercialState)
  commercialState?: BillingCommercialState;

  @IsOptional()
  @IsBoolean()
  confirmUnauthorized?: boolean;
}

export class DeclinePlanRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class CheckPublicPlanRequestAccountDto {
  @IsOptional()
  @TransformToE164Phone()
  @IsString()
  @IsInternationalPhone()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  websiteDomain?: string;
}
