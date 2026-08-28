import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';
import { CreatePublicSubscriptionDto } from '../dto/create-public-subscription.dto.js';
import { SubscriptionsService } from '../services/subscriptions.service.js';

@Controller('v1/public/subscriptions')
export class PublicSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreatePublicSubscriptionDto) {
    const data = await this.subscriptionsService.subscribePublic(body);
    return ApiResponseBuilder.created(data);
  }
}
