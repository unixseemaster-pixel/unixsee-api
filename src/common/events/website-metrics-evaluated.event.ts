export interface WebsiteMetricsEvaluatedEvent {
  vpsNodeId: string;
  websiteId: string;
  domain: string;
  metrics: {
    concurrentRequests: number;
    requestRate?: number;
  };
  probe?: {
    isUp: boolean;
    statusCode: number | null;
    responseTimeMs: number | null;
    ttfbMs: number | null;
    errorMessage: string | null;
  } | null;

  timestamp: string;
}
