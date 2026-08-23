import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';
import { StorageService } from '#/modules/storage/storage.service.js';

const MAX_PUBLIC_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]);

@Controller('v1/uploads')
export class PublicUploadsController {
  constructor(private readonly storageService: StorageService) {}

  @Post('public')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PUBLIC_UPLOAD_BYTES },
    }),
  )
  async uploadPublic(@UploadedFile() file: Express.Multer.File) {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      throw new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'File type not allowed' });
    }

    const ext = file.originalname.split('.').pop() || 'bin';
    const storageKey =
      'public-uploads/' + crypto.randomUUID() + '.' + ext;

    await this.storageService.upload(storageKey, file.buffer, { contentType: file.mimetype });

    const { signedUrl } = await this.storageService.createSignedUrl(
      storageKey,
      7 * 24 * 60 * 60, // 7 days for public uploads
    );

    return ApiResponseBuilder.ok({
      fileName: file.originalname,
      contentType: file.mimetype,
      sizeBytes: file.size,
      storageKey,
      downloadUrl: signedUrl,
    });
  }
}
