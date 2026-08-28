import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';

import { CreatePublicContactMessageDto } from '../dto/create-public-contact-message.dto.js';
import { ContactMessagesService } from '../services/contact-messages.service.js';

@Controller('v1/public/contact-messages')
export class PublicContactMessagesController {
  constructor(
    private readonly contactMessagesService: ContactMessagesService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreatePublicContactMessageDto) {
    const data = await this.contactMessagesService.createPublic(body);
    return ApiResponseBuilder.created(data);
  }
}
