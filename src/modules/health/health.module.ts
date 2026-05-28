import { Module } from '@nestjs/common';
import { HealthService } from './services/health.service';
import { HealthEvaluationService } from './services/health-evaluation.service';

@Module({
  providers: [HealthService, HealthEvaluationService]
})
export class HealthModule {}
