import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Role } from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';

import {
  BillingLifecycleDto,
  CompleteBillingItemDto,
  RecordPlanTermsDto,
  RenewBillingItemDto,
  ReplacePlanBillingDto,
} from '../dto/billing.dto.js';
import { BillingService } from '../services/billing.service.js';

@Controller('v1/admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('websites/:websiteId/billing-items')
  async listByWebsite(@Param('websiteId') websiteId: string) {
    const data = await this.billing.listByWebsiteAdmin(websiteId);
    return ApiResponseBuilder.ok(data);
  }

  @Get('billing-items/:id')
  async get(@Param('id') id: string) {
    const data = await this.billing.getAdmin(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post('websites/:websiteId/billing-items/record-plan-terms')
  @HttpCode(HttpStatus.CREATED)
  async recordPlanTerms(
    @Param('websiteId') websiteId: string,
    @Body() body: RecordPlanTermsDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.billing.recordPlanTerms(websiteId, user.id, body);
    return ApiResponseBuilder.created(data);
  }

  @Post('billing-items/:id/renew')
  @HttpCode(HttpStatus.OK)
  async renew(
    @Param('id') id: string,
    @Body() body: RenewBillingItemDto,
    @CurrentUser() user: CurrentUserType,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.billing.renew(id, user.id, body, idempotencyKey);
    return ApiResponseBuilder.ok(data);
  }

  @Post('websites/:websiteId/billing-items/replace-plan')
  @HttpCode(HttpStatus.OK)
  async replacePlan(
    @Param('websiteId') websiteId: string,
    @Body() body: ReplacePlanBillingDto,
    @CurrentUser() user: CurrentUserType,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.billing.replacePlan(
      websiteId,
      user.id,
      body,
      idempotencyKey,
    );
    return ApiResponseBuilder.ok(data);
  }

  @Post('billing-items/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body() body: BillingLifecycleDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.billing.cancel(id, user.id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Post('billing-items/:id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Param('id') id: string,
    @Body() body: CompleteBillingItemDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.billing.complete(id, user.id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Post('billing-items/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pause(
    @Param('id') id: string,
    @Body() body: BillingLifecycleDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.billing.pause(id, user.id, body);
    return ApiResponseBuilder.ok(data);
  }
}
