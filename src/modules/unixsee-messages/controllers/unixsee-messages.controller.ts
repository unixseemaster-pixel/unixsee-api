import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';

import { UnixseeMessagesService } from '../services/unixsee-messages.service.js';

@Controller('v1/unixsee-messages')
export class UnixseeMessagesController {
  constructor(private readonly unixseeMessagesService: UnixseeMessagesService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.unixseeMessagesService.listForUser(user.id, {
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    const data = await this.unixseeMessagesService.getForUser(user.id, id);
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id/attachments/:attachmentId/download')
  async downloadAttachment(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const data = await this.unixseeMessagesService.createDownloadUrlForUser(
      user.id,
      id,
      attachmentId,
    );
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    const data = await this.unixseeMessagesService.markRead(user.id, id);
    return ApiResponseBuilder.ok(data);
  }
}
