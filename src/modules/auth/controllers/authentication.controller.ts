import { Body, Controller, Post } from '@nestjs/common';

import { AuthenticationService } from '../services/authentication.service.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';
import type { RegisterDto } from '../dto/register.dto.js';

@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

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
