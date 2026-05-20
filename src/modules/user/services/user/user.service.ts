import { Injectable } from '@nestjs/common';

import type { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import type { UserCreateInput } from '#/generated/prisma/models.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOneByUsername({ username }: { username: string }) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    return user;
  }

  async create({
    username,
    email,
    fullName,
    phoneNumber,
    password,
  }: UserCreateInput) {
    const userToCreate = {
      username,
      password,
      ...(email && { email }),
      ...(fullName && { fullName }),
      ...(phoneNumber && { phoneNumber }),
    };
    return this.prisma.user.create({
      data: userToCreate,
    });
  }
}
