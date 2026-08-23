import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  TicketServiceCategory,
  TicketStatus,
} from '#/generated/prisma/enums.js';

export class CreateTicketDto {
  @IsEnum(TicketServiceCategory)
  service!: TicketServiceCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  subject!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(10000)
  description!: string;

  @IsOptional()
  @IsUUID()
  websiteId?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class CreateTicketMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}

export class AssignTicketDto {
  @IsUUID()
  assigneeId!: string;
}

export class ListTicketsQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketServiceCategory)
  service?: TicketServiceCategory;

  @IsOptional()
  @IsUUID()
  websiteId?: string;
}
