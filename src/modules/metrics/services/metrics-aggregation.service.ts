import { Injectable } from '@nestjs/common';

// Shared domain aggregation utilities for metrics computations across overview, dashboard, and future analytics modules.
@Injectable()
export class MetricsAggregationService {
  sum(values: number[]) {
    return values.reduce((sum, value) => sum + value, 0);
  }

  average(values: number[]) {
    if (values.length === 0) return 0;
    return this.sum(values) / values.length;
  }

  max(values: number[]) {
    if (values.length === 0) return 0;
    return Math.max(...values);
  }

  min(values: number[]) {
    if (values.length === 0) return 0;
    return Math.min(...values);
  }

  sumConcurrentRequests(
    websites: { latestMetric: { concurrentRequests: number } }[],
  ) {
    return websites.reduce(
      (sum, w) => sum + (w.latestMetric.concurrentRequests ?? 0),
      0,
    );
  }

  averageConcurrentRequests(
    websites: { latestMetric: { concurrentRequests: number } }[],
  ) {
    if (websites.length === 0) return 0;

    return this.sumConcurrentRequests(websites) / websites.length;
  }

  getMaxConcurrentRequestsPerWebsite(
    websites: { latestMetric: { concurrentRequests: number } }[],
  ) {
    return this.max(
      websites.map((w) => w.latestMetric.concurrentRequests ?? 0),
    );
  }

  getMinConcurrentRequestsPerWebsite(
    websites: { latestMetric: { concurrentRequests: number } }[],
  ) {
    return this.min(
      websites.map((w) => w.latestMetric.concurrentRequests ?? 0),
    );
  }
}
