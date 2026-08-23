import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import {
  AuthorizationCaseStatus,
  Role,
} from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import {
  NeedsMoreInfoAuthorizationDto,
  RejectAuthorizationDto,
} from '../dto/authorization-case.dto.js';
import { toAdminAuthorizationCaseDto } from '../mappers/authorization-case.mapper.js';
import { AuthorizationCasesService } from '../services/authorization-cases.service.js';

@Controller('v1/admin/authorization-cases')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminAuthorizationCasesController {
  constructor(
    private readonly authorizationCasesService: AuthorizationCasesService,
  ) {}

  @Get()
  async list(
    @Query('status') status?: AuthorizationCaseStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.authorizationCasesService.listAdmin({
      status,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok({
      items: data.items.map(toAdminAuthorizationCaseDto),
      total: data.total,
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.authorizationCasesService.getAdmin(id);
    return ApiResponseBuilder.ok(toAdminAuthorizationCaseDto(data));
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.authorizationCasesService.approve(id, user.id);
    return ApiResponseBuilder.ok(toAdminAuthorizationCaseDto(data));
  }

  @Post(':id/needs-info')
  @HttpCode(HttpStatus.OK)
  async needsInfo(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body() body: NeedsMoreInfoAuthorizationDto,
  ) {
    const data = await this.authorizationCasesService.needsMoreInfo(
      id,
      user.id,
      body,
    );
    return ApiResponseBuilder.ok(toAdminAuthorizationCaseDto(data));
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType,
    @Body() body: RejectAuthorizationDto,
  ) {
    const data = await this.authorizationCasesService.reject(id, user.id, body);
    return ApiResponseBuilder.ok(toAdminAuthorizationCaseDto(data));
  }
}
