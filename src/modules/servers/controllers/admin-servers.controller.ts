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
  UseGuards,
} from '@nestjs/common';

import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';
import { Role } from '#/generated/prisma/enums.js';
import { Roles } from '#/modules/auth/decorators/roles.decorator.js';
import { RolesGuard } from '#/modules/auth/guards/roles.guard.js';
import {
  CreateEnrollmentTokenDto,
  CreateServerDto,
  RevokeAgentCredentialsDto,
  UpdateServerDto,
} from '../dto/servers.dto.js';
import { ServersService } from '../services/servers.service.js';

@Controller('v1/admin/servers')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.OPERATOR)
export class AdminServersController {
  constructor(private readonly serversService: ServersService) {}

  @Get()
  async list(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const data = await this.serversService.list({
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
    return ApiResponseBuilder.ok(data);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateServerDto) {
    const data = await this.serversService.create(body);
    return ApiResponseBuilder.created(data);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const data = await this.serversService.get(id);
    return ApiResponseBuilder.ok(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateServerDto) {
    const data = await this.serversService.update(id, body);
    return ApiResponseBuilder.ok(data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    const data = await this.serversService.delete(id);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/enrollment-tokens')
  @HttpCode(HttpStatus.CREATED)
  async createToken(
    @Param('id') id: string,
    @Body() body: CreateEnrollmentTokenDto,
  ) {
    const data = await this.serversService.createEnrollmentToken(id, body);
    return ApiResponseBuilder.created(data);
  }

  @Post(':id/enrollment-tokens/:tokenId/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeToken(
    @Param('id') id: string,
    @Param('tokenId') tokenId: string,
  ) {
    const data = await this.serversService.revokeEnrollmentToken(id, tokenId);
    return ApiResponseBuilder.ok(data);
  }

  @Post(':id/agent/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeAgent(
    @Param('id') id: string,
    @Body() body: RevokeAgentCredentialsDto,
  ) {
    const data = await this.serversService.revokeAgentCredentials(
      id,
      body.reason,
    );
    return ApiResponseBuilder.ok(data);
  }
}
