import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import {
  BillingCommercialModel,
  BillingCommercialState,
  BillingInterval,
  BillingItemKind,
} from '#/generated/prisma/enums.js';

export class ListCustomerBillingQueryDto {
  @IsOptional()
  @IsEnum(BillingItemKind)
  kind?: BillingItemKind;

  @IsOptional()
  @IsUUID()
  websiteId?: string;
}

export class CommercialTermsDto {
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

export class RenewBillingItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  confirmUnauthorized?: boolean;
}

export class ReplacePlanBillingDto extends CommercialTermsDto {
  @IsUUID()
  planId!: string;
}

export class RecordPlanTermsDto extends CommercialTermsDto {
  @IsOptional()
  @IsUUID()
  planId?: string;
}

export class BillingLifecycleDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @IsString()
  effectAt?: string;
}

export class CompleteBillingItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsString()
  effectAt?: string;
}
