import { Body, Controller, Get, HttpCode, HttpStatus, Put, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import {
  SaveAuthorizationDraftDto,
  SubmitAuthorizationDto,
  toPackageInput,
} from '../dto/authorization-case.dto.js';
import { AuthorizationCasesService } from '../services/authorization-cases.service.js';
import { toCustomerAuthorizationCaseDto } from '../mappers/authorization-case.mapper.js';

@Controller('v1/authorization-cases')
export class AuthorizationCasesController {
  constructor(
    private readonly authorizationCasesService: AuthorizationCasesService,
  ) {}

  @Get('me')
  async getMine(@CurrentUser() user: CurrentUserType) {
    const data = await this.authorizationCasesService.getMine(user.id);
    return ApiResponseBuilder.ok(
      data ? toCustomerAuthorizationCaseDto(data) : null,
    );
  }

  @Put('me/draft')
  @HttpCode(HttpStatus.OK)
  async saveDraft(
    @CurrentUser() user: CurrentUserType,
    @Body() body: SaveAuthorizationDraftDto,
  ) {
    const data = await this.authorizationCasesService.saveDraft(
      user.id,
      toPackageInput(body),
    );
    return ApiResponseBuilder.ok(toCustomerAuthorizationCaseDto(data));
  }

  @Post('me/submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @CurrentUser() user: CurrentUserType,
    @Body() body: SubmitAuthorizationDto,
  ) {
    const data = await this.authorizationCasesService.submit(
      user.id,
      toPackageInput(body),
    );
    return ApiResponseBuilder.ok(toCustomerAuthorizationCaseDto(data));
  }

  @Post('me/document')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @CurrentUser() user: CurrentUserType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.authorizationCasesService.uploadDocument(user.id, file);
    return ApiResponseBuilder.ok(data);
  }
}
