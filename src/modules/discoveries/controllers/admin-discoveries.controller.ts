import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { DiscoveryStatus, Role } from '#/generated/prisma/enums.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import { AssignDiscoveryDto } from '../dto/discoveries.dto.js';
import { DiscoveriesService } from '../services/discoveries.service.js';

@Controller('v1/admin/discoveries')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminDiscoveriesController {
  constructor(private readonly discoveriesService: DiscoveriesService) {}

  @Get()
  async list(
    @Query('status') status?: DiscoveryStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.discoveriesService.list({
      status,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.discoveriesService.get(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assign(@Param('id') id: string, @Body() body: AssignDiscoveryDto) {
    const data = await this.discoveriesService.assign(id, body);
    return ApiResponseBuilder.ok(data);
  }
}
