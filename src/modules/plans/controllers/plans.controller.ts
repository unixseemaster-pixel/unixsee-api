import { Controller, Get } from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { PlansService } from '../services/plans.service.js';

@Controller('v1/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async list() {
    const data = await this.plansService.listPublished();
    return ApiResponseBuilder.ok(data);
  }
}
