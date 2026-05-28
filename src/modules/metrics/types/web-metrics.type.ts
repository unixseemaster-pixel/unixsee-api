export type WebsiteMetricsType = {
  websiteId: string;
  latestMetric: {
    activeVisitors: number;
    recordedAt: Date | null;
    requestRate?: undefined | number;
  };
};
