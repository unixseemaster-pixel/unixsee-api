import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { WebsiteMetricsEvaluatedEvent } from '#/common/events/website-metrics-evaluated.event.js';
import { WebsiteProbeEvaluatedEvent } from '#/common/events/website-probe-evaluated.event.js';
import { EVENT_NAMES } from '#/common/events/event.constants.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class EventDispatcherService {
  private readonly logger = createAppLogger(EventDispatcherService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  dispatchWebsiteMetricsEvaluated(payload: WebsiteMetricsEvaluatedEvent): void {
    this.eventEmitter.emit(EVENT_NAMES.WEBSITE_METRICS_EVALUATED, payload);
    this.logger.debug('event.website_metrics_evaluated.dispatched', {
      websiteId: payload.websiteId,
      vpsNodeId: payload.vpsNodeId,
    });
  }

  dispatchWebsiteProbeEvaluated(payload: WebsiteProbeEvaluatedEvent): void {
    this.eventEmitter.emit(EVENT_NAMES.WEBSITE_PROBE_EVALUATED, payload);
    this.logger.debug('event.website_probe_evaluated.dispatched', {
      websiteId: payload.websiteId,
      isUp: payload.availability.isUp,
      statusCode: payload.availability.statusCode,
    });
  }
}
