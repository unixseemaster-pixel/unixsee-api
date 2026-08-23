import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { UnixseeMessageStatus } from '#/generated/prisma/enums.js';

export class UnixseeMessageLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  url!: string;

  @IsIn(['external', 'dashboard'])
  kind!: 'external' | 'dashboard';
}

export class CreateUnixseeMessageDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsIn(['fa', 'en'])
  contentLocale!: 'fa' | 'en';

  @IsOptional()
  @IsUUID()
  websiteId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => UnixseeMessageLinkDto)
  links?: UnixseeMessageLinkDto[];
}

export class UpdateUnixseeMessageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body?: string;

  @IsOptional()
  @IsIn(['fa', 'en'])
  contentLocale?: 'fa' | 'en';

  @IsOptional()
  @IsUUID()
  websiteId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => UnixseeMessageLinkDto)
  links?: UnixseeMessageLinkDto[];
}

export class AdminListUnixseeMessagesQueryDto {
  @IsOptional()
  @IsEnum(UnixseeMessageStatus)
  status?: UnixseeMessageStatus;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
