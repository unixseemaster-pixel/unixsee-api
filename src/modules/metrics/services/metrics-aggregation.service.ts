import { Injectable } from '@nestjs/common';

// Shared domain aggregation utilities for metrics computations across overview, dashboard, and future analytics modules.
// sum visitors, average visitors, max/min visitors, time-series aggregation
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

  sumActiveVisitors(websites: { latestMetric: { activeVisitors: number } }[]) {
    return websites.reduce(
      (sum, w) => sum + (w.latestMetric.activeVisitors ?? 0),
      0,
    );
  }

  averageActiveVisitors(
    websites: { latestMetric: { activeVisitors: number } }[],
  ) {
    if (websites.length === 0) return 0;

    return this.sumActiveVisitors(websites) / websites.length;
  }

  getMaxVisitorsPerWebsite(
    websites: { latestMetric: { activeVisitors: number } }[],
  ) {
    return this.max(websites.map((w) => w.latestMetric.activeVisitors ?? 0));
  }

  getMinVisitorsPerWebsite(
    websites: { latestMetric: { activeVisitors: number } }[],
  ) {
    return this.min(websites.map((w) => w.latestMetric.activeVisitors ?? 0));
  }
}
