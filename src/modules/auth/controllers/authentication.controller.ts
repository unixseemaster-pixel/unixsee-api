import { Body, Controller, Post } from '@nestjs/common';

import { AuthenticationService } from '../services/authentication.service.js';
import { Public } from '#/modules/auth/decorators/public.decorator.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';

@Controller('v1/auth')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  @Public()
  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register({ ...body });
  }

  @Public()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login({ ...body });
  }
}
