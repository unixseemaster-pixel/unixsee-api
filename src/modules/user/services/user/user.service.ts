import { Injectable } from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import type { UserCreateInput } from '#/generated/prisma/models.js';
import bcrypt from 'bcryptjs';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class UserService {
  private readonly logger = createAppLogger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOneByPhoneNumber(phoneNumber: string) {
    return this.prisma.user.findUnique({
      where: { phoneNumber },
      omit: {
        hashedRt: true,
        password: true,
      },
    });
  }

  async findOneById(userId: string) {
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
      phoneNumber,

      ...(password && { password }),
      ...(email && { email }),
      ...(fullName && { fullName }),
      ...(username && { username }),
    };

    const user = await this.prisma.user.create({
      data: userToCreate,
      omit: {
        hashedRt: true,
        password: true,
      },
    });

    this.logger.log('user.created', {
      userId: user.id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
    });

    return user;
  }

  async updateRtHash({ userId, rt }: { userId: string; rt: string }) {
    const rtHash = await bcrypt.hash(rt, 12);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRt: rtHash,
      },
    });

    this.logger.debug('user.refresh_token_hash.updated', { userId });

    return rtHash;
  }
}
