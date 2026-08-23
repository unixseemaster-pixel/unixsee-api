export interface WebsiteMetricsEvaluatedEvent {
  vpsNodeId: string;
  websiteId: string;
  domain: string;
  metrics: {
    concurrentRequests: number;
    requestRate?: number;
    activeConnections?: number | null;
    processingRequests?: number | null;
    bytesInPerSecond?: number | null;
    bytesOutPerSecond?: number | null;
  };
  timestamp: string;
}
