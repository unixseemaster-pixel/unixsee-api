import { Controller, Get } from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { TenantsService } from '../services/tenants.service.js';

@Controller('v1/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  async me(@CurrentUser() user: CurrentUserType) {
    const data = await this.tenantsService.getMyTenant(user.id);
    return ApiResponseBuilder.ok(data);
  }

  @Get('me/members')
  async members(@CurrentUser() user: CurrentUserType) {
    const data = await this.tenantsService.getMyMembers(user.id);
    return ApiResponseBuilder.ok(data);
  }
}
