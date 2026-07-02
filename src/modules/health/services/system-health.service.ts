import { Injectable } from '@nestjs/common';

import {
  SystemHealthInputType,
  SystemHealthStatusType,
} from '../types/health.type.js';

// Computes current system health state from metrics and alerts without side effects (read-side logic).
@Injectable()
export class SystemHealthService {
  calculate(input: SystemHealthInputType): SystemHealthStatusType {
    if (input.isUp === false || this.hasCriticalAlert(input.alerts)) {
      return 'critical';
    }

    if (this.hasWarningAlert(input.alerts)) {
      return 'warning';
    }

    if (this.isUnderHighLoad(input.concurrentRequests)) {
      return 'monitoring';
    }

    return 'healthy';
  }

  private hasCriticalAlert(alerts: SystemHealthInputType['alerts']) {
    return alerts.some((a) => a.status === 'critical');
  }

  private hasWarningAlert(alerts: SystemHealthInputType['alerts']) {
    return alerts.some((a) => a.status === 'warning');
  }

  private isUnderHighLoad(concurrentRequests: number) {
    return concurrentRequests > 500;
  }
}
