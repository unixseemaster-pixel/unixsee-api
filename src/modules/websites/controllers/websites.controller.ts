import { Controller, Get, Param } from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { WebsitesService } from '../services/websites.service.js';

@Controller('v1/websites')
export class WebsitesController {
  constructor(private readonly websitesService: WebsitesService) {}

  @Get()
  async list(@CurrentUser() user: CurrentUserType) {
    const data = await this.websitesService.getUserWebsites(user.id);
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    const data = await this.websitesService.getWebsiteForUser(user.id, id);
    return ApiResponseBuilder.ok(data);
  }
}
