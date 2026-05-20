import { Controller, Post } from '@nestjs/common';

import { UserService } from '../../services/user/user.service.js';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
}
