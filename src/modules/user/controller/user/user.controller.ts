import { Controller, Post } from '@nestjs/common';

import { UserService } from '../../services/user/user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
}
