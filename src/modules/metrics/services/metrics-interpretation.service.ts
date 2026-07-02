import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsInterpretationService {
  interpretCpu(cpu: number) {
    if (cpu < 60) {
      return { status: 'healthy', label: 'Normal' };
    }

    if (cpu < 85) {
      return { status: 'monitoring', label: 'High traffic detected' };
    }

    return { status: 'warning', label: 'Server under pressure' };
  }

  interpretRequestPressure(count: number) {
    if (count < 50) {
      return { status: 'normal', label: 'Low activity' };
    }

    if (count < 200) {
      return { status: 'monitoring', label: 'Request activity elevated' };
    }

    return { status: 'high', label: 'High traffic detected' };
  }
}
