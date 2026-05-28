import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsAggregationService {
  calculateAverage(values: number[]) {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  calculateMax(values: number[]) {
    return Math.max(...values);
  }

  calculateMin(values: number[]) {
    return Math.min(...values);
  }
}
