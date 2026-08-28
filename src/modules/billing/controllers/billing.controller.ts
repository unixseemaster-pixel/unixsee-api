import { Controller, Get, Param } from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';

import { BillingService } from '../services/billing.service.js';

@Controller('v1/websites')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get(':id/billing')
  async getWebsiteBilling(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    const data = await this.billing.getWebsiteBillingForUser(user.id, id);
    return ApiResponseBuilder.ok(data);
  }
}
