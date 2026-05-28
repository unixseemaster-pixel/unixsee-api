import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { HealthEvaluationService } from '../services/health-evaluation.service.js';
import type { WebsiteMetricsEvaluatedEvent } from '#/common/events/website-metrics-evaluated.event.js';
import { EVENT_NAMES } from '#/common/events/event.constants.js';

@Injectable()
export class MetricsHealthListener {
  private readonly logger = new Logger(MetricsHealthListener.name);

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
    } catch (error: any) {
      this.logger.error(
        `Health evaluation failed for website ${event.websiteId}: ${error.message}`,
      );
    }
  }
}
