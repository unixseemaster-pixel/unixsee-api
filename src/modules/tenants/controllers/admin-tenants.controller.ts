import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import {
  MembershipRole,
  Role,
  UserAccountStatus,
} from '#/generated/prisma/enums.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { TenantsService } from '../services/tenants.service.js';

class CreateTenantDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsUUID()
  ownerUserId!: string;
}

class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @IsEnum(UserAccountStatus)
  status?: UserAccountStatus;
}

class CreateMembershipDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;
}

class UpdateMembershipDto {
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;
}

@Controller('v1/admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminTenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('tenants')
  async list(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.tenantsService.listAdmin({
      search,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Get('tenants/:id')
  async get(@Param('id') id: string) {
    const data = await this.tenantsService.getAdmin(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post('tenants')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateTenantDto) {
    const data = await this.tenantsService.createTenant(body);
    return ApiResponseBuilder.created(data);
  }

  @Patch('tenants/:id')
  async update(@Param('id') id: string, @Body() body: UpdateTenantDto) {
    const data = await this.tenantsService.updateTenant(id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Get('memberships')
  async listMemberships(@Query('tenantId') tenantId?: string) {
    const data = await this.tenantsService.listMembershipsAdmin({ tenantId });
    return ApiResponseBuilder.ok(data);
  }

  @Post('memberships')
  @HttpCode(HttpStatus.CREATED)
  async createMembership(@Body() body: CreateMembershipDto) {
    const data = await this.tenantsService.createMembership(body);
    return ApiResponseBuilder.created(data);
  }

  @Patch('memberships/:id')
  async updateMembership(
    @Param('id') id: string,
    @Body() body: UpdateMembershipDto,
  ) {
    const data = await this.tenantsService.updateMembership(id, body);
    return ApiResponseBuilder.ok(data);
  }
}
