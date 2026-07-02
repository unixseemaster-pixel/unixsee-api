export type WebsiteMetricsType = {
  websiteId: string;
  vpsNodeId: string;
  domain: string;
  displayName: string | null;
  isActive: boolean;
  latestMetric: {
    concurrentRequests: number;
    recordedAt: Date | null;
    requestRate?: undefined | number;
  };
  latestProbe: {
    recordedAt: Date | null;
    isUp: boolean | null;
    statusCode: number | null;
    responseTimeMs: number | null;
    ttfbMs: number | null;
    errorMessage: string | null;
  };
};
