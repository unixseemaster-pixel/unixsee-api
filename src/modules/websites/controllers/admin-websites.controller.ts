import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import {
  BillingCommercialModel,
  BillingCommercialState,
  BillingInterval,
  Role,
  WebsiteManagementCoverage,
} from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { WebsitesService } from '../services/websites.service.js';

class AdminCreateWebsiteDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  vpsNodeId?: string;

  @IsString()
  @MaxLength(255)
  domain!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsOptional()
  @IsBoolean()
  activatePlan?: boolean;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  managementCoverage?: WebsiteManagementCoverage;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  wordpressAdminUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  wordpressAdminUsername?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  wordpressAdminPassword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  directAdminUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  directAdminUsername?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  directAdminPassword?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsEnum(BillingInterval)
  interval?: BillingInterval;

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

class AssignWebsiteDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  planId?: string;
}

class TransferWebsiteDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  confirmUnauthorized?: boolean;
}

class UpdateWebsiteDto {
  @IsOptional()
  @IsString()
  managementCoverage?: WebsiteManagementCoverage;

  @IsOptional()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_valid_protocol: true,
  })
  @MaxLength(2048)
  wordpressAdminUrl?: string | null;
}

@Controller('v1/admin/websites')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminWebsitesController {
  constructor(private readonly websitesService: WebsitesService) {}

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
    @Query('managementCoverage')
    managementCoverage?: WebsiteManagementCoverage,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.websitesService.listAdmin({
      search,
      tenantId,
      userId,
      managementCoverage,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: AdminCreateWebsiteDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.websitesService.createAdmin({
      ...body,
      actorId: user.id,
    });
    return ApiResponseBuilder.created(data);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.websitesService.getAdmin(id);
    return ApiResponseBuilder.ok(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateWebsiteDto) {
    const data = await this.websitesService.updateAdmin(id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assign(@Param('id') id: string, @Body() body: AssignWebsiteDto) {
    const data = await this.websitesService.assign(id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(
    @Param('id') id: string,
    @Body() body: TransferWebsiteDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.websitesService.transfer(id, {
      ...body,
      actorId: user.id,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/retire')
  @HttpCode(HttpStatus.OK)
  async retire(@Param('id') id: string) {
    const data = await this.websitesService.retire(id);
    return ApiResponseBuilder.ok(data);
  }
}
