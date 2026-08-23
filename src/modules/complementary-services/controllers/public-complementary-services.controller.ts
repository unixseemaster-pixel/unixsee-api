import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';
import { CreatePublicComplementaryRequestDto } from '../dto/complementary-services.dto.js';
import { ComplementaryServicesService } from '../services/complementary-services.service.js';

@Controller('v1/public')
export class PublicComplementaryServicesController {
  constructor(
    private readonly complementaryServices: ComplementaryServicesService,
  ) {}

  @Public()
  @Get('service-catalog')
  async catalog() {
    const data = await this.complementaryServices.listPublishedCatalog();
    return ApiResponseBuilder.ok(data);
  }

  @Public()
  @Post('complementary-service-requests')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreatePublicComplementaryRequestDto) {
    const data = await this.complementaryServices.createPublicRequest(body);
    return ApiResponseBuilder.created(data);
  }
}
