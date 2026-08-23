import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import {
  TicketServiceCategory,
  TicketStatus,
} from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { CreateTicketDto, CreateTicketMessageDto } from '../dto/tickets.dto.js';
import { TICKET_ATTACHMENT_MAX_BYTES } from '../ticket-attachments.js';
import { TicketsService } from '../services/tickets.service.js';

@Controller('v1/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('services')
  listServices() {
    return ApiResponseBuilder.ok(this.ticketsService.listServices());
  }

  @Get()
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query('status') status?: TicketStatus,
    @Query('service') service?: TicketServiceCategory,
    @Query('websiteId') websiteId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.ticketsService.listForUser(user.id, {
      status,
      service,
      websiteId,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() body: CreateTicketDto,
  ) {
    const data = await this.ticketsService.create(user.id, body);
    return ApiResponseBuilder.created(data);
  }

  @Get(':id')
  async get(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    const data = await this.ticketsService.getForUser(user.id, id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() body: CreateTicketMessageDto,
  ) {
    const data = await this.ticketsService.addCustomerMessage(user.id, id, {
      body: body.body,
      idempotencyKey: body.idempotencyKey,
    });
    return ApiResponseBuilder.created(data);
  }

  @Post(':id/attachments/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: TICKET_ATTACHMENT_MAX_BYTES },
    }),
  )
  async uploadAttachment(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.ticketsService.uploadAttachmentForUser(
      user.id,
      id,
      file,
    );
    return ApiResponseBuilder.created(data);
  }

  @Get(':id/attachments/:attachmentId/download')
  async downloadAttachment(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const data = await this.ticketsService.createDownloadUrlForUser(
      user.id,
      id,
      attachmentId,
    );
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  async close(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    const data = await this.ticketsService.closeForUser(user.id, id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  async reopen(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    const data = await this.ticketsService.reopenForUser(user.id, id);
    return ApiResponseBuilder.ok(data);
  }
}
