import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { ContactMessageStatus, Role } from '#/generated/prisma/enums.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';

import { UpdateContactMessageStatusDto } from '../dto/update-contact-message-status.dto.js';
import { ContactMessagesService } from '../services/contact-messages.service.js';

@Controller('v1/admin/contact-messages')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminContactMessagesController {
  constructor(
    private readonly contactMessagesService: ContactMessagesService,
  ) {}

  @Get()
  async list(
    @Query('status') status?: ContactMessageStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.contactMessagesService.listAdmin({
      status,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.contactMessagesService.getAdmin(id);
    return ApiResponseBuilder.ok(data);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateContactMessageStatusDto,
  ) {
    const data = await this.contactMessagesService.updateStatus(
      id,
      body.status,
    );
    return ApiResponseBuilder.ok(data);
  }
}
