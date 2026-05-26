import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IngestAgentMetricsDto } from '../agent/dto/ingest-agent-metrics.dto.js';

export interface MetricsIngestedEventPayload {
  vpsNodeId: string;
  batch: IngestAgentMetricsDto['batch'];
}

@Injectable()
export class EventDispatcherService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  dispatchMetricsIngested(payload: MetricsIngestedEventPayload): void {
    this.eventEmitter.emit('metrics.ingested', payload);
  }
}
