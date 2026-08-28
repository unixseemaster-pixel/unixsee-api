import { Controller, Get, Query } from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';

import { ListCustomerBillingQueryDto } from '../dto/billing.dto.js';
import { BillingService } from '../services/billing.service.js';

@Controller('v1/billing')
export class CustomerBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query() query: ListCustomerBillingQueryDto,
  ) {
    const data = await this.billing.listBillingForUser(user.id, {
      kind: query.kind,
      websiteId: query.websiteId,
    });
    return ApiResponseBuilder.ok(data);
  }
}
