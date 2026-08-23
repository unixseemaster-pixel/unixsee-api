import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { NotificationStatus } from '#/generated/prisma/enums.js';

export class CreateNotificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  titleFa!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  titleEn!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  bodyFa!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  bodyEn!: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  titleFa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  bodyFa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  bodyEn?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string | null;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}
