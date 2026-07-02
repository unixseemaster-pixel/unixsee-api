export type SystemHealthStatusType =
  | 'healthy'
  | 'monitoring'
  | 'warning'
  | 'critical';

export type SystemHealthInputType = {
  concurrentRequests: number;
  alerts: { status: string }[];
  metricsStatus?: string;
};
