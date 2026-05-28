export const EVENT_NAMES = {
  METRICS_INGESTED: 'metrics.ingested',
  WEBSITE_METRICS_EVALUATED: 'website.metrics.evaluated',
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_RESOLVED: 'incident.resolved',
} as const;

export const INTERNAL_EVENTS = {
  METRICS_INGESTED: 'internal.metrics.ingested',
  INTERNAL_WEBSITE_METRICS_EVALUATED: 'internal.website.metrics.evaluated',
} as const;
