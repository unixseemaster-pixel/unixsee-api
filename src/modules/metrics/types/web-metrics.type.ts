export type WebsiteMetricsType = {
  websiteId: string;
  latestMetric: {
    concurrentRequests: number;
    recordedAt: Date | null;
    requestRate?: undefined | number;
  };
};
