import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RealtimeGateway } from './gateways/realtime.gateway.js';
import { RealtimeService } from './services/realtime.service.js';

@Module({
  providers: [RealtimeGateway, RealtimeService, JwtService],
})
export class RealtimeModule {}
