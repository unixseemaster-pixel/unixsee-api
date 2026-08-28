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
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Role } from '#/generated/prisma/enums.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { UsersService } from '../services/users.service.js';
import { TenantsService } from '#/modules/tenants/services/tenants.service.js';

class AdminCreateUserDto {
  @IsString()
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsBoolean()
  authorized?: boolean;
}

class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  username?: string | null;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsBoolean()
  authorized?: boolean;
}

class AccountSecurityActionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

@Controller('v1/admin/users')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.usersService.listAdmin({
      search,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.usersService.getAdmin(id);
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id/tenant')
  async getTenant(@Param('id') id: string) {
    const tenant = await this.tenantsService.ensurePersonalTenantForUser(id);
    return ApiResponseBuilder.ok(tenant);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: AdminCreateUserDto) {
    const data = await this.usersService.createAdmin(body);
    await this.tenantsService.ensurePersonalTenantForUser(
      data.id,
      data.fullName ?? data.phoneNumber ?? undefined,
    );
    const withMemberships = await this.usersService.getAdmin(data.id);
    return ApiResponseBuilder.created(withMemberships);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: AdminUpdateUserDto) {
    const data = await this.usersService.updateAdmin(id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(
    @Param('id') id: string,
    @Body() body: AccountSecurityActionDto,
  ) {
    const data = await this.usersService.suspend(id, body.reason);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('id') id: string,
    @Body() body: AccountSecurityActionDto,
  ) {
    const data = await this.usersService.restore(id, body.reason);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/revoke-sessions')
  @HttpCode(HttpStatus.OK)
  async revokeSessions(
    @Param('id') id: string,
    @Body() body: AccountSecurityActionDto,
  ) {
    const data = await this.usersService.revokeSessions(id, body.reason);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/start-recovery')
  @HttpCode(HttpStatus.OK)
  async startRecovery(
    @Param('id') id: string,
    @Body() body: AccountSecurityActionDto,
  ) {
    const data = await this.usersService.startRecovery(id, body.reason);
    return ApiResponseBuilder.ok(data);
  }
}
