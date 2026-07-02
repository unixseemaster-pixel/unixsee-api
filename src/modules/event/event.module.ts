import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { EventDispatcherService } from './event-dispatcher.service.js';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 50,
      ignoreErrors: false,
    }),
  ],
  providers: [EventDispatcherService],
  exports: [EventDispatcherService],
})
export class EventModule {}

// import { Module } from '@nestjs/common';
// import { EventDispatcherService } from './event-dispatcher.service.js';
// import { EventEmitter2 } from '@nestjs/event-emitter';

// @Module({
//   providers: [EventDispatcherService, EventEmitter2],
//   exports: [EventDispatcherService],
// })
// export class EventModule {}
