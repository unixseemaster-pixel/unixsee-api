import { Injectable } from '@nestjs/common';

import type {
  TrafficLoadType,
  TrafficStateType,
} from '../types/traffic-load.type.js';

type TrafficMetricInput = {
  concurrentRequests: number | null | undefined;
  requestRate: number | null | undefined;
};

@Injectable()
export class TrafficLoadService {
  resolve(metric: TrafficMetricInput | null | undefined): TrafficStateType {
    if (!metric) {
      return {
        load: 'unknown',
        activity: 'unknown',
      };
    }

    const concurrentRequests = metric.concurrentRequests ?? 0;
    const requestRate = metric.requestRate ?? 0;

    if (concurrentRequests === 0 && requestRate === 0) {
      return {
        load: 'idle',
        activity: 'idle',
      };
    }

    return {
      load: this.resolveValue(concurrentRequests),
      activity: this.resolveValue(requestRate),
    };
  }

  private resolveValue(value: number): TrafficLoadType {
    if (value <= 0) return 'idle';
    if (value <= 50) return 'normal';
    if (value <= 200) return 'busy';
    if (value <= 500) return 'high';

    return 'critical';
  }
}
