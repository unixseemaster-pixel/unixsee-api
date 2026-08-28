import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { ComplementaryRequestStatus, Role } from '#/generated/prisma/enums.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import {
  CreateDeliverableDto,
  CreateQuotationDto,
  CreateServiceAssignmentDto,
  CreateUsageDto,
  PatchComplementaryRequestDto,
  PatchDeliverableDto,
  PatchUsageDto,
} from '../dto/complementary-services.dto.js';
import { ComplementaryServicesService } from '../services/complementary-services.service.js';

@Controller('v1/admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminComplementaryServicesController {
  constructor(
    private readonly complementaryServices: ComplementaryServicesService,
  ) {}

  @Get('complementary-service-requests')
  async listRequests(
    @Query('status') status?: ComplementaryRequestStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.complementaryServices.listAdmin({
      status,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Get('complementary-service-requests/:id')
  async getRequest(@Param('id') id: string) {
    const data = await this.complementaryServices.getAdmin(id);
    return ApiResponseBuilder.ok(data);
  }
  @Patch('complementary-service-requests/:id')
  async patchRequest(
    @Param('id') id: string,
    @Body() body: PatchComplementaryRequestDto,
  ) {
    const data = await this.complementaryServices.patchRequest(id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Post('complementary-service-requests/:id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptRequest(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.complementaryServices.acceptRequest(
      id,
      user.id,
      idempotencyKey,
    );
    return ApiResponseBuilder.ok(data);
  }
  @Post('complementary-service-requests/:id/quotations')
  @HttpCode(HttpStatus.CREATED)
  async addQuotation(
    @Param('id') id: string,
    @Body() body: CreateQuotationDto,
  ) {
    const data = await this.complementaryServices.addQuotation(id, body);
    return ApiResponseBuilder.created(data);
  }

  @Post('service-assignments')
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(
    @Body() body: CreateServiceAssignmentDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    const data = await this.complementaryServices.createAssignment({
      ...body,
      actorId: user.id,
    });
    return ApiResponseBuilder.created(data);
  }

  @Get('usage')
  async listUsage(
    @Query('assignmentId') assignmentId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.complementaryServices.listUsage({
      assignmentId,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post('usage')
  @HttpCode(HttpStatus.CREATED)
  async createUsage(@Body() body: CreateUsageDto) {
    const data = await this.complementaryServices.createUsage(body);
    return ApiResponseBuilder.created(data);
  }

  @Patch('usage/:id')
  async patchUsage(@Param('id') id: string, @Body() body: PatchUsageDto) {
    const data = await this.complementaryServices.patchUsage(id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Get('deliverables')
  async listDeliverables(
    @Query('assignmentId') assignmentId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.complementaryServices.listDeliverables({
      assignmentId,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post('deliverables')
  @HttpCode(HttpStatus.CREATED)
  async createDeliverable(@Body() body: CreateDeliverableDto) {
    const data = await this.complementaryServices.createDeliverable(body);
    return ApiResponseBuilder.created(data);
  }

  @Patch('deliverables/:id')
  async patchDeliverable(
    @Param('id') id: string,
    @Body() body: PatchDeliverableDto,
  ) {
    const data = await this.complementaryServices.patchDeliverable(id, body);
    return ApiResponseBuilder.ok(data);
  }
}
