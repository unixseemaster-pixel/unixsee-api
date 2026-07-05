export const EVENT_NAMES = {
  METRICS_INGESTED: 'metrics.ingested',
  WEBSITE_METRICS_EVALUATED: 'website.metrics.evaluated',
  WEBSITE_PROBE_EVALUATED: 'website.probe.evaluated',
  OVERVIEW_SNAPSHOT: 'overview:snapshot',
  OVERVIEW_WEBSITE_TICK: 'overview:website_tick',
  OVERVIEW_VPS_TICK: 'overview:vps_tick',
  DASHBOARD_WEBSITE_DETAILS_TICK: 'dashboard:website_details_tick',
  MONITORING_SNAPSHOT: 'monitoring:snapshot',
  MONITORING_VPS_TICK: 'monitoring:vps_tick',
  MONITORING_WEBSITE_TICK: 'monitoring:website_tick',
  INCIDENT_CREATED: 'incident.created',
  INCIDENT_RESOLVED: 'incident.resolved',
} as const;

export const INTERNAL_EVENTS = {
  METRICS_INGESTED: 'internal.metrics.ingested',
  INTERNAL_WEBSITE_METRICS_EVALUATED: 'internal.website.metrics.evaluated',
  INTERNAL_WEBSITE_PROBE_EVALUATED: 'internal.website.probe.evaluated',
} as const;
