import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';
import {
  CheckPublicPlanRequestAccountDto,
  CreatePublicPlanRequestDto,
} from '../dto/plan-request.dto.js';
import { PlanRequestsService } from '../services/plan-requests.service.js';

@Controller('v1/public/plan-requests')
export class PublicPlanRequestsController {
  constructor(private readonly planRequestsService: PlanRequestsService) {}

  @Public()
  @Post('account-check')
  @HttpCode(HttpStatus.OK)
  async checkAccount(@Body() body: CheckPublicPlanRequestAccountDto) {
    const data = await this.planRequestsService.checkPublicAccount(body);
    return ApiResponseBuilder.ok(data);
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreatePublicPlanRequestDto) {
    const data = await this.planRequestsService.createPublic(body);
    return ApiResponseBuilder.created(data);
  }
}
