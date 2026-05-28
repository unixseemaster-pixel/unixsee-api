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

import type { MetricsIngestedEventPayload } from '#/modules/event/event-dispatcher.service.js';
import type { WebsiteMetricsEvaluatedEvent } from '#/common/events/website-metrics-evaluated.event.js';
import { EVENT_NAMES } from '#/common/events/event.constants.js';

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

    const allowedVpsNodeIds =
      await this.realtimeService.getAllowedVpsNodeIdsForUser(user.id);

    const allowedWebsiteIds =
      await this.realtimeService.getAllowedWebsiteIdsForUser(user.id);

    for (const vpsNodeId of allowedVpsNodeIds) {
      await client.join(`vps:${vpsNodeId}`);
    }

    for (const websiteId of allowedWebsiteIds) {
      await client.join(`website:${websiteId}`);
    }

    await client.join(`user:${user.id}`);

    this.logger.log(
      `User ${user.id} connected | VPS: ${allowedVpsNodeIds.length} | Websites: ${allowedWebsiteIds.length}`,
    );
  }

  // =========================
  // STEP 3 — VPS LIVE TICKS
  // =========================
  @OnEvent(EVENT_NAMES.METRICS_INGESTED, { async: true })
  async handleMetricsIngestedEvent(
    event: MetricsIngestedEventPayload,
  ): Promise<void> {
    try {
      const { vpsNodeId, batch } = event;

      for (const entry of batch) {
        const payload = {
          timestamp: entry.timestamp,
          metrics: {
            cpuUsagePercent: entry.metrics.cpuMean,
            memoryUsedMB: entry.metrics.ramMeanMB,
            memoryTotalMB: entry.metrics.ramTotalMB,
            liteSpeedConnections: entry.metrics.lsConnectionsPeak,
            diskIops: entry.metrics.diskIopsMean,
          },
        };

        this.server.to(`vps:${vpsNodeId}`).emit('vps:live_tick', payload);
      }
    } catch (error: any) {
      this.logger.error(error.message);
    }
  }

  // =========================
  // STEP 4 — WEBSITE HEALTH STREAM
  // =========================
  @OnEvent(EVENT_NAMES.WEBSITE_METRICS_EVALUATED, { async: true })
  async handleWebsiteMetricsEvaluated(
    event: WebsiteMetricsEvaluatedEvent,
  ): Promise<void> {
    this.server
      .to(`website:${event.websiteId}`)
      .emit(EVENT_NAMES.WEBSITE_METRICS_EVALUATED, {
        websiteId: event.websiteId,
        domain: event.domain,
        concurrentRequests: event.metrics.concurrentRequests,
        timestamp: event.timestamp,
      });
  }

  // =========================
  // STEP 5 — INCIDENT CREATED
  // =========================
  @OnEvent(EVENT_NAMES.INCIDENT_CREATED, { async: true })
  async handleIncidentCreated(event: {
    websiteId: string;
    severity: string;
    title: string;
    message: string;
  }) {
    this.server
      .to(`website:${event.websiteId}`)
      .emit(EVENT_NAMES.INCIDENT_CREATED, event);
  }

  // =========================
  // STEP 6 — INCIDENT RESOLVED
  // =========================
  @OnEvent(EVENT_NAMES.INCIDENT_RESOLVED, { async: true })
  async handleIncidentResolved(event: { websiteId: string; alertId: string }) {
    this.server
      .to(`website:${event.websiteId}`)
      .emit(EVENT_NAMES.INCIDENT_RESOLVED, event);
  }
}
