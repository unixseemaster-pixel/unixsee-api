import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/modules/prisma/services/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOneById({ id }: { id: string }) {
    // const user = await this.prisma.user.findUnique({
    //   where: { id },
    //   include: { image: true },
    // });
    // return user;
  }
}
