export interface WebsiteMetricsEvaluatedEvent {
  vpsNodeId: string;
  websiteId: string;
  domain: string;
  metrics: {
    concurrentRequests: number;
    requestRate?: number;
  };

  timestamp: string;
}
