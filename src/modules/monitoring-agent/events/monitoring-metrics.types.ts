/**
 * Archived monitoring-agent ingest event payload (ADR 0009).
 * Not emitted by the live Phase 1 agent plane.
 */
import type { MonitoringIngestDto } from '../dto/monitoring-ingest.dto.js';

export interface MonitoringMetricsIngestedEventPayload {
  vpsNodeId: string;
  batch: MonitoringIngestDto['batch'];
}

/** Former EVENT_NAMES.METRICS_INGESTED — reserved for monitoring-agent resume. */
export const MONITORING_METRICS_INGESTED_EVENT = 'metrics.ingested' as const;
