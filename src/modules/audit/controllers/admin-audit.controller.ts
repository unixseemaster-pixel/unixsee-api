import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Role } from '#/generated/prisma/enums.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { AuditService } from '../services/audit.service.js';

@Controller('v1/admin/audit-records')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(
    @Query('entityType') entityType?: string,
    @Query('actorId') actorId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.auditService.listAdmin({
      entityType,
      actorId,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }
}
