import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { IngestAgentMetricsDto } from '../agent/dto/ingest-agent-metrics.dto.js';
import { WebsiteMetricsEvaluatedEvent } from '#/common/events/website-metrics-evaluated.event.js';
import { EVENT_NAMES } from '#/common/events/event.constants.js';

export interface MetricsIngestedEventPayload {
  vpsNodeId: string;
  batch: IngestAgentMetricsDto['batch'];
}

@Injectable()
export class EventDispatcherService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  dispatchMetricsIngested(payload: MetricsIngestedEventPayload): void {
    this.eventEmitter.emit(EVENT_NAMES.METRICS_INGESTED, payload);
  }

  dispatchWebsiteMetricsEvaluated(payload: WebsiteMetricsEvaluatedEvent): void {
    this.eventEmitter.emit(EVENT_NAMES.WEBSITE_METRICS_EVALUATED, payload);
  }
}
