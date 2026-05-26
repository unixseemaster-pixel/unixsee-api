import { Module } from '@nestjs/common';
import { EventDispatcherService } from './event-dispatcher.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Module({
  providers: [EventDispatcherService, EventEmitter2],
  exports: [EventDispatcherService],
})
export class EventModule {}
