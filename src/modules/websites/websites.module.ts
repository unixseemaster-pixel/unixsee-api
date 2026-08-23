import { Module } from '@nestjs/common';

import { WebsitesService } from './services/websites.service.js';
import { WebsitesController } from './controllers/websites.controller.js';
import { AdminWebsitesController } from './controllers/admin-websites.controller.js';

@Module({
  providers: [WebsitesService],
  controllers: [WebsitesController, AdminWebsitesController],
  exports: [WebsitesService],
})
export class WebsitesModule {}
