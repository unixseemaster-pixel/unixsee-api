import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from '../services/auth.service';
import { Public } from 'src/common/decorators/public.decorator';
import { RegisterDto } from '../dtos/register.dto';

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
