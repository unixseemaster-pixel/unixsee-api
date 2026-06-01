import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { UserService } from '../../services/user/user.service.js';
import { CurrentUser } from '#/modules/auth/decorators/current-user.decorator.js';
import type { CurrentUserType } from '#/@types/express/index.js';
import { ApiResponseBuilder } from '#/common/http/api-response.builder.js';

@Controller('v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: CurrentUserType) {
    return ApiResponseBuilder.ok(user);
  }
}
