import { Injectable } from '@nestjs/common';

import { WebMetricsRepository } from '../repositories/web-metrics.repository.js';
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
      vpsNodeId: website.vpsNodeId,
      domain: website.domain,
      displayName: website.displayName,
      isActive: website.isActive,
      latestMetric: this.mapLatestMetric(website.latest),
      latestProbe: this.mapLatestProbe({
        latestProbe: website.latestProbe,
        lastIsUp: website.lastIsUp,
        lastStatusCode: website.lastStatusCode,
        lastResponseTimeMs: website.lastResponseTimeMs,
        lastProbeAt: website.lastProbeAt,
      }),
    }));
  }

  async getWebsiteOverview(websiteId: string): Promise<WebsiteMetricsType> {
    const website =
      await this.webMetricsRepository.findOverviewByWebsiteId(websiteId);

    if (!website) {
      throw new Error(`Website not found: ${websiteId}`);
    }

    return {
      websiteId: website.websiteId,
      vpsNodeId: website.vpsNodeId,
      domain: website.domain,
      displayName: website.displayName,
      isActive: website.isActive,
      latestMetric: this.mapLatestMetric(website.latest),
      latestProbe: this.mapLatestProbe({
        latestProbe: website.latestProbe,
        lastIsUp: website.lastIsUp,
        lastStatusCode: website.lastStatusCode,
        lastResponseTimeMs: website.lastResponseTimeMs,
        lastProbeAt: website.lastProbeAt,
      }),
    };
  }

  private mapLatestProbe(input: {
    latestProbe: {
      recordedAt: Date;
      isUp: boolean;
      statusCode: number | null;
      responseTimeMs: number | null;
      ttfbMs: number | null;
      errorMessage: string | null;
    } | null;
    lastIsUp: boolean | null;
    lastStatusCode: number | null;
    lastResponseTimeMs: number | null;
    lastProbeAt: Date | null;
  }) {
    return {
      recordedAt: input.lastProbeAt ?? input.latestProbe?.recordedAt ?? null,
      isUp: input.lastIsUp ?? input.latestProbe?.isUp ?? null,
      statusCode: input.lastStatusCode ?? input.latestProbe?.statusCode ?? null,
      responseTimeMs:
        input.lastResponseTimeMs ?? input.latestProbe?.responseTimeMs ?? null,
      ttfbMs: input.latestProbe?.ttfbMs ?? null,
      errorMessage: input.latestProbe?.errorMessage ?? null,
    };
  }

  private mapLatestMetric(latest: WebMetric | null) {
    if (!latest) {
      return {
        concurrentRequests: 0,
        recordedAt: null,
      };
    }

    return {
      concurrentRequests: latest.concurrentRequests ?? 0,
      requestRate: latest.requestRate ?? 0,
      recordedAt: latest.recordedAt,
    };
  }
}
