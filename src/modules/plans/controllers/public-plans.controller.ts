import { Controller, Get } from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';
import { PlansService } from '../services/plans.service.js';

@Controller('v1/public/plans')
export class PublicPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  async list() {
    const data = await this.plansService.listPublished();
    return ApiResponseBuilder.ok(data);
  }
}
