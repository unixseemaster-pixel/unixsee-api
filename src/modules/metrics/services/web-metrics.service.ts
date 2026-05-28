import { Injectable } from '@nestjs/common';

import { WebMetricsRepository } from '../repositories/web-metrics.repository.js';
import { MetricsInterpretationService } from './metrics-interpretation.service.js';
import { WebMetric } from '#/generated/prisma/client.js';
import { WebsiteMetricsType } from '../types/web-metrics.type.js';

@Injectable()
export class WebMetricsService {
  constructor(private webMetricsRepository: WebMetricsRepository) {}

  async getWebsitesOverviewByUser(
    userId: string,
  ): Promise<WebsiteMetricsType[]> {
    const websites = await this.webMetricsRepository.findLatestByUserId(userId);

    return websites.map((website) => ({
      websiteId: website.websiteId,
      latestMetric: this.mapLatestMetric(website.latest),
    }));
  }

  async getWebsiteOverview(websiteId: string): Promise<WebsiteMetricsType> {
    const latest =
      await this.webMetricsRepository.findLatestByWebsiteId(websiteId);

    return {
      websiteId,
      latestMetric: this.mapLatestMetric(latest),
    };
  }

  private mapLatestMetric(latest: WebMetric | null) {
    if (!latest) {
      return {
        activeVisitors: 0,
        recordedAt: null,
      };
    }

    return {
      activeVisitors: latest.concurrentRequests ?? 0,
      requestRate: latest.requestRate ?? 0,
      recordedAt: latest.recordedAt,
    };
  }
}
