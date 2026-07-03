import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { HealthEvaluationService } from '../services/health-evaluation.service.js';
import type { WebsiteMetricsEvaluatedEvent } from '#/common/events/website-metrics-evaluated.event.js';
import { EVENT_NAMES } from '#/common/events/event.constants.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class MetricsHealthListener {
  private readonly logger = createAppLogger(MetricsHealthListener.name);

  constructor(
    private readonly healthEvaluationService: HealthEvaluationService,
  ) {}

  @OnEvent(EVENT_NAMES.WEBSITE_METRICS_EVALUATED, { async: true })
  async handleWebsiteMetricsEvaluated(event: WebsiteMetricsEvaluatedEvent) {
    try {
      await this.healthEvaluationService.evaluateWebsiteTraffic({
        websiteId: event.websiteId,
        concurrentRequests: event.metrics.concurrentRequests,
      });
    } catch (error: unknown) {
      this.logger.error('health.website_traffic_evaluation.failed', error as Error, {
        websiteId: event.websiteId,
      });
    }
  }
}
