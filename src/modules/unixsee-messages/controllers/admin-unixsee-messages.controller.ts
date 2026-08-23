import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { Role, UnixseeMessageStatus } from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';

import {
  CreateUnixseeMessageDto,
  UpdateUnixseeMessageDto,
} from '../dto/unixsee-messages.dto.js';
import { UNIXSEE_MESSAGE_ATTACHMENT_MAX_BYTES } from '../unixsee-message-attachments.js';
import { UnixseeMessagesService } from '../services/unixsee-messages.service.js';

@Controller('v1/admin/unixsee-messages')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminUnixseeMessagesController {
  constructor(private readonly unixseeMessagesService: UnixseeMessagesService) {}

  @Get()
  async list(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: UnixseeMessageStatus,
    @Query('tenantId') tenantId?: string,
  ) {
    const data = await this.unixseeMessagesService.listAdmin({
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
      status,
      tenantId,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Get('tenants/:tenantId/compose-context')
  async composeContext(@Param('tenantId') tenantId: string) {
    const data =
      await this.unixseeMessagesService.getTenantComposeContext(tenantId);
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.unixseeMessagesService.getAdmin(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() body: CreateUnixseeMessageDto,
  ) {
    const data = await this.unixseeMessagesService.create(user.id, body);
    return ApiResponseBuilder.created(data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUnixseeMessageDto,
  ) {
    const data = await this.unixseeMessagesService.update(id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string) {
    const data = await this.unixseeMessagesService.publish(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(@Param('id') id: string) {
    const data = await this.unixseeMessagesService.withdraw(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/attachments/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UNIXSEE_MESSAGE_ATTACHMENT_MAX_BYTES },
    }),
  )
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.unixseeMessagesService.uploadAttachmentForAdmin(
      id,
      file,
    );
    return ApiResponseBuilder.created(data);
  }

  @Get(':id/attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const data = await this.unixseeMessagesService.createDownloadUrlForAdmin(
      id,
      attachmentId,
    );
    return ApiResponseBuilder.ok(data);
  }

  @Delete(':id/attachments/:attachmentId')
  @HttpCode(HttpStatus.OK)
  async removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const data = await this.unixseeMessagesService.removeAttachmentForAdmin(
      id,
      attachmentId,
    );
    return ApiResponseBuilder.ok(data);
  }
}
