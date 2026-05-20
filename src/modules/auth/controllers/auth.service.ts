import { Body, Controller, Post } from '@nestjs/common';

import type { AuthService } from '../services/auth.service.js';
import { Public } from '#/common/decorators/public.decorator.js';
import type { RegisterDto } from '../dtos/register.dto.js';

@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/auth/register')
  register(@Body() body: RegisterDto) {
    return this.authService.register({ ...body });
  }

  @Public()
  @Post('/auth/login')
  login(@Body() body: RegisterDto) {
    return this.authService.register({ ...body });
  }
}
