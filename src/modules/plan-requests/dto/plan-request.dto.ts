import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreatePublicPlanRequestDto {
  @IsUUID()
  planId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactName!: string;

  @ValidateIf((o: CreatePublicPlanRequestDto) => !o.contactEmail)
  @IsString()
  @MinLength(1)
  @MaxLength(32)
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
}

export class DeclinePlanRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class CheckPublicPlanRequestAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  websiteDomain?: string;
}
