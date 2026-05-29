import { Module } from '@nestjs/common';

import { WebsitesService } from './services/websites.service.js';

@Module({
  providers: [WebsitesService],
})
export class WebsitesModule {}
