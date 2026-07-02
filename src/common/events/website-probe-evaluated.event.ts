import type { WebsiteProbeSource } from '#/generated/prisma/enums.js';

export interface WebsiteProbeEvaluatedEvent {
  websiteId: string;
  domain: string;
  probeSource: WebsiteProbeSource;
  availability: {
    isUp: boolean;
    statusCode: number | null;
    responseTimeMs: number | null;
    ttfbMs: number | null;
    errorMessage: string | null;
    lastProbeAt: string;
  };
  timestamp: string;
}
