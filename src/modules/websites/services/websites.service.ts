import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WebsitesService {
  constructor(private readonly prisma: PrismaService) {}

  getUserWebsites(userId: string) {
    return this.prisma.website.findMany({ where: { userId } });
  }
}
