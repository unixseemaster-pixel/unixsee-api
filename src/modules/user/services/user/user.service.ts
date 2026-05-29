import { Injectable } from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import type { UserCreateInput } from '#/generated/prisma/models.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOneById(userId) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      omit: {
        password: true,
      },
    });
  }

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
    const userToCreate: UserCreateInput = {
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
