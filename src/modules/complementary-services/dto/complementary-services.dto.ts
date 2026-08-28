import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import {
  IsInternationalPhone,
  TransformToE164Phone,
} from '#/common/validation/is-international-phone.decorator.js';
import {
  BillingCommercialModel,
  BillingCommercialState,
  BillingInterval,
  ComplementaryEngagementPreference,
  ComplementaryRequestStatus,
} from '#/generated/prisma/enums.js';

export class CreatePublicComplementaryRequestDto {
  @IsUUID()
  catalogItemId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactName!: string;

  @TransformToE164Phone()
  @IsString()
  @IsInternationalPhone()
  contactPhone!: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string;
}

export class CreateComplementaryRequestDto {
  @IsUUID()
  catalogItemId!: string;

  @IsOptional()
  @IsUUID()
  websiteId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(253)
  websiteDomain?: string;

  @IsEnum(ComplementaryEngagementPreference)
  engagementPreference!: ComplementaryEngagementPreference;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(800)
  description!: string;

  @IsOptional()
  @IsObject()
  scope?: Record<string, unknown>;
}

export class PatchComplementaryRequestDto {
  @IsOptional()
  @IsEnum(ComplementaryRequestStatus)
  status?: ComplementaryRequestStatus;

  @IsOptional()
  @IsUUID()
  tenantId?: string | null;

  @IsOptional()
  @IsUUID()
  websiteId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  details?: string | null;
}

export class CreateQuotationDto {
  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  validUntil?: string;
}

export class CreateServiceAssignmentDto {
  @IsUUID()
  requestId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  assigneeNote?: string;

  @IsOptional()
  @IsString()
  startedAt?: string;

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

export class PatchUsageDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  unit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class CreateUsageDto {
  @IsUUID()
  assignmentId!: string;

  @IsString()
  @MaxLength(200)
  label!: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class PatchDeliverableDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;
}

export class CreateDeliverableDto {
  @IsUUID()
  assignmentId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}
