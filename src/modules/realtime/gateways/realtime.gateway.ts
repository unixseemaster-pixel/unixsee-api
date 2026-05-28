import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

import { RealtimeService } from '#/modules/realtime/services/realtime.service.js';
import { EVENT_NAMES } from '#/common/events/event.constants.js';

import type { MetricsIngestedEventPayload } from '#/modules/event/event-dispatcher.service.js';
import type { WebsiteMetricsEvaluatedEvent } from '#/common/events/website-metrics-evaluated.event.js';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly realtimeService: RealtimeService) {}

  handleConnection(client: Socket): void {
    this.initializeSocketSession(client).catch((error) => {
      this.logger.error(`Socket handshake failed: ${error.message}`);
      client.disconnect(true);
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  private async initializeSocketSession(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token;

    if (!token) {
      client.disconnect(true);
      return;
    }

    const user = await this.realtimeService.verifySocketToken(token);

    if (!user) {
      client.disconnect(true);
      return;
    }

    client.data.user = user;

    const vpsNodeIds = await this.realtimeService.getAllowedVpsNodeIdsForUser(
      user.id,
    );
    const websiteIds = await this.realtimeService.getAllowedWebsiteIdsForUser(
      user.id,
    );

    for (const vpsNodeId of vpsNodeIds) {
      await client.join(`vps:${vpsNodeId}`);
    }

    for (const websiteId of websiteIds) {
      await client.join(`website:${websiteId}`);
    }

    await client.join(`user:${user.id}`);

    this.logger.log(
      `User ${user.id} connected | VPS: ${vpsNodeIds.length} | Websites: ${websiteIds.length}`,
    );
  }

  // =========================================================
  // STEP 1 — VPS LIVE TICKS (REAL-TIME INFRA METRICS)
  // =========================================================
  @OnEvent(EVENT_NAMES.METRICS_INGESTED, { async: true })
  async handleMetricsIngestedEvent(
    event: MetricsIngestedEventPayload,
  ): Promise<void> {
    try {
      const { vpsNodeId, batch } = event;

      for (const entry of batch) {
        this.server.to(`vps:${vpsNodeId}`).emit('vps:live_tick', {
          vpsNodeId,
          timestamp: entry.timestamp,
          metrics: {
            cpuUsagePercent: entry.metrics.cpuMean,
            memoryUsedMB: entry.metrics.ramMeanMB,
            memoryTotalMB: entry.metrics.ramTotalMB,
            liteSpeedConnections: entry.metrics.lsConnectionsPeak,
            diskIops: entry.metrics.diskIopsMean,
          },
        });
      }
    } catch (error: any) {
      this.logger.error(`VPS live tick error: ${error.message}`);
    }
  }

  // =========================================================
  // STEP 2 — WEBSITE METRICS STREAM (UX-FOCUSED LAYER)
  // =========================================================
  @OnEvent(EVENT_NAMES.WEBSITE_METRICS_EVALUATED, { async: true })
  async handleWebsiteMetricsEvaluated(
    event: WebsiteMetricsEvaluatedEvent,
  ): Promise<void> {
    try {
      this.server
        .to(`website:${event.websiteId}`)
        .emit(EVENT_NAMES.WEBSITE_METRICS_EVALUATED, {
          websiteId: event.websiteId,
          domain: event.domain,
          concurrentRequests: event.metrics.concurrentRequests,
          timestamp: event.timestamp,
        });
    } catch (error: any) {
      this.logger.error(`Website metrics stream error: ${error.message}`);
    }
  }

  // =========================================================
  // STEP 3 — INCIDENT CREATED
  // =========================================================
  @OnEvent(EVENT_NAMES.INCIDENT_CREATED, { async: true })
  async handleIncidentCreated(event: {
    websiteId: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
  }): Promise<void> {
    try {
      this.server
        .to(`website:${event.websiteId}`)
        .emit(EVENT_NAMES.INCIDENT_CREATED, event);
    } catch (error: any) {
      this.logger.error(`Incident created stream error: ${error.message}`);
    }
  }

  // =========================================================
  // STEP 4 — INCIDENT RESOLVED
  // =========================================================
  @OnEvent(EVENT_NAMES.INCIDENT_RESOLVED, { async: true })
  async handleIncidentResolved(event: {
    websiteId: string;
    alertId: string;
  }): Promise<void> {
    try {
      this.server
        .to(`website:${event.websiteId}`)
        .emit(EVENT_NAMES.INCIDENT_RESOLVED, event);
    } catch (error: any) {
      this.logger.error(`Incident resolved stream error: ${error.message}`);
    }
  }
}
