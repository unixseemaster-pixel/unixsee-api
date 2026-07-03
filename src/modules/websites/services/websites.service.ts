import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class WebsitesService {
  private readonly logger = createAppLogger(WebsitesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserWebsites(userId: string) {
    const websites = await this.prisma.website.findMany({ where: { userId } });

    this.logger.debug('websites.user_list.loaded', {
      userId,
      count: websites.length,
    });

    return websites;
  }
}
