import { Module } from '@nestjs/common';
import { WebsitesService } from './services/websites.service';

@Module({
  providers: [WebsitesService]
})
export class WebsitesModule {}
