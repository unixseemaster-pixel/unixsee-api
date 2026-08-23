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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Role, TicketStatus } from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import {
  AssignTicketDto,
  CreateTicketMessageDto,
} from '../dto/tickets.dto.js';
import { TICKET_ATTACHMENT_MAX_BYTES } from '../ticket-attachments.js';
import { TicketsService } from '../services/tickets.service.js';

@Controller('v1/admin/tickets')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async list(
    @Query('status') status?: TicketStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.ticketsService.listAdmin({
      status,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.ticketsService.getAdmin(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/in-progress')
  @HttpCode(HttpStatus.OK)
  async markInProgress(@Param('id') id: string) {
    const data = await this.ticketsService.markInProgress(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assign(@Param('id') id: string, @Body() body: AssignTicketDto) {
    const data = await this.ticketsService.assign(id, body.assigneeId);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolve(@Param('id') id: string) {
    const data = await this.ticketsService.resolve(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  async reopen(@Param('id') id: string) {
    const data = await this.ticketsService.reopen(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('id') id: string,
    @Body() body: CreateTicketMessageDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.ticketsService.addAdminMessage(user.id, id, {
      body: body.body,
      isInternal: body.isInternal,
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
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.ticketsService.uploadAttachmentForAdmin(id, file);
    return ApiResponseBuilder.created(data);
  }

  @Get(':id/attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const data = await this.ticketsService.createDownloadUrlForAdmin(
      id,
      attachmentId,
    );
    return ApiResponseBuilder.ok(data);
  }
}
