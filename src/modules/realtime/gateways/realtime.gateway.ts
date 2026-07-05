import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

import { RealtimeService } from '#/modules/realtime/services/realtime.service.js';
import { EVENT_NAMES } from '#/common/events/event.constants.js';
import { TrafficLoadService } from '#/modules/metrics/services/traffic-load.service.js';

import type { MetricsIngestedEventPayload } from '#/modules/event/event-dispatcher.service.js';
import type { WebsiteMetricsEvaluatedEvent } from '#/common/events/website-metrics-evaluated.event.js';
import type { WebsiteProbeEvaluatedEvent } from '#/common/events/website-probe-evaluated.event.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

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
  private readonly authorizationChecks = new Map<
    string,
    ReturnType<typeof setInterval>
  >();
  private readonly expirationTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly logger = createAppLogger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly trafficLoadService: TrafficLoadService,
  ) {}

  handleConnection(client: Socket): void {
    this.initializeSocketSession(client).catch((error) => {
      this.logger.error('socket.handshake.failed', error as Error, {
        socketId: client.id,
      });
      client.disconnect(true);
    });
  }

  handleDisconnect(client: Socket): void {
    this.clearAuthorizationTimers(client.id);
    this.logger.debug('socket.disconnected', { socketId: client.id });
  }

  private async initializeSocketSession(client: Socket): Promise<void> {
    const token =
      this.normalizeToken(client.handshake.auth?.token) ??
      this.normalizeToken(client.handshake.headers.authorization);
    const monitoringAccessToken =
      this.normalizeToken(client.handshake.auth?.monitoringAccessToken) ??
      this.normalizeToken(
        client.handshake.headers['monitoring-access-token'],
      ) ??
      this.normalizeToken(client.handshake.headers['monitor-access-token']);

    if (!token) {
      client.disconnect(true);
      return;
    }

    const session = await this.realtimeService.authorizeOverviewSocket(token);

    if (!session) {
      client.disconnect(true);
      return;
    }

    const { user } = session;
    client.data.user = user;
    client.data.hasMonitoringAccess = false;
    this.scheduleAuthorizationChecks(
      client,
      token,
      monitoringAccessToken,
      session.expiresAt,
    );

    const vpsNodeIds = await this.realtimeService.getAllowedVpsNodeIdsForUser(
      user.id,
    );
    const websiteIds = await this.realtimeService.getAllowedWebsiteIdsForUser(
      user.id,
    );

    await client.join(`user:${user.id}`);

    const monitoringSession =
      await this.realtimeService.authorizeMonitoringSocket(
        token,
        monitoringAccessToken,
      );

    if (monitoringSession?.user.id === user.id) {
      client.data.hasMonitoringAccess = true;

      for (const vpsNodeId of vpsNodeIds) {
        await client.join(`vps:${vpsNodeId}`);
      }

      for (const websiteId of websiteIds) {
        await client.join(`website:${websiteId}`);
      }

      const monitoringSnapshot =
        await this.realtimeService.getMonitoringSnapshot(user.id);
      client.emit(EVENT_NAMES.MONITORING_SNAPSHOT, monitoringSnapshot);
    }

    const overviewSnapshot = await this.realtimeService.getOverviewSnapshot(
      user.id,
    );
    client.emit(EVENT_NAMES.OVERVIEW_SNAPSHOT, overviewSnapshot);

    this.logger.log('socket.connected', {
      socketId: client.id,
      userId: user.id,
      overviewAccess: true,
      monitoringAccess: client.data.hasMonitoringAccess,
      vpsCount: vpsNodeIds.length,
      websiteCount: websiteIds.length,
    });
  }

  private scheduleAuthorizationChecks(
    client: Socket,
    token: string,
    monitoringAccessToken: string | null,
    expiresAt: Date,
  ): void {
    this.clearAuthorizationTimers(client.id);

    const authorizationCheck = setInterval(() => {
      this.revalidateSocket(client, token, monitoringAccessToken).catch(
        (error: Error) => {
          this.logger.error('socket.authorization_check.failed', error, {
            socketId: client.id,
          });
          client.disconnect(true);
        },
      );
    }, 30_000);

    const expirationTimer = setTimeout(
      () => client.disconnect(true),
      Math.max(0, expiresAt.getTime() - Date.now()),
    );

    authorizationCheck.unref();
    expirationTimer.unref();
    this.authorizationChecks.set(client.id, authorizationCheck);
    this.expirationTimers.set(client.id, expirationTimer);
  }

  private async revalidateSocket(
    client: Socket,
    token: string,
    monitoringAccessToken: string | null,
  ): Promise<void> {
    if (!client.connected) {
      this.clearAuthorizationTimers(client.id);
      return;
    }

    const session = client.data.hasMonitoringAccess
      ? await this.realtimeService.authorizeMonitoringSocket(
          token,
          monitoringAccessToken,
        )
      : await this.realtimeService.authorizeOverviewSocket(token);

    if (!session || session.user.id !== client.data.user?.id) {
      client.disconnect(true);
    }
  }

  private clearAuthorizationTimers(clientId: string): void {
    const authorizationCheck = this.authorizationChecks.get(clientId);
    const expirationTimer = this.expirationTimers.get(clientId);

    if (authorizationCheck) {
      clearInterval(authorizationCheck);
      this.authorizationChecks.delete(clientId);
    }

    if (expirationTimer) {
      clearTimeout(expirationTimer);
      this.expirationTimers.delete(clientId);
    }
  }

  private normalizeToken(value: unknown): string | null {
    const token = Array.isArray(value) ? value[0] : value;

    if (typeof token !== 'string' || token.trim().length === 0) {
      return null;
    }

    return token.replace(/^Bearer\s+/i, '').trim();
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
        const payload = {
          vpsNodeId,
          timestamp: entry.timestamp,
          metrics: {
            cpuUsagePercent: entry.metrics.cpuMean,
            memoryUsedMB: entry.metrics.ramMeanMB,
            memoryTotalMB: entry.metrics.ramTotalMB,
            liteSpeedConnections: entry.metrics.lsConnectionsPeak,
            diskReadBytesPerSecond: entry.metrics.diskReadBytesPerSecondMean,
            diskWriteBytesPerSecond: entry.metrics.diskWriteBytesPerSecondMean,
            diskIops: entry.metrics.diskIopsMean,
            storageTotalMB: entry.metrics.storageTotalMB,
            storageAvailableMB: entry.metrics.storageAvailableMB,
            networkRxBytesPerSecond:
              entry.metrics.networkRxBytesPerSecondMean ?? 0,
            networkTxBytesPerSecond:
              entry.metrics.networkTxBytesPerSecondMean ?? 0,
          },
        };

        this.server.to(`vps:${vpsNodeId}`).emit('vps:live_tick', payload);
      }

      const monitoringSnapshot =
        await this.realtimeService.getVpsMonitoringSnapshot(vpsNodeId);

      if (monitoringSnapshot) {
        this.server
          .to(`vps:${vpsNodeId}`)
          .emit(EVENT_NAMES.MONITORING_VPS_TICK, monitoringSnapshot);
      }

      const overviewUserIds =
        await this.realtimeService.getUserIdsByVpsNodeId(vpsNodeId);

      await Promise.all(
        overviewUserIds.map(async (userId) => {
          const overviewTick = await this.realtimeService.getOverviewVpsTick(
            userId,
            vpsNodeId,
          );

          if (!overviewTick) {
            return;
          }

          this.server
            .to(`user:${userId}`)
            .emit(EVENT_NAMES.OVERVIEW_VPS_TICK, overviewTick);
        }),
      );
    } catch (error: unknown) {
      this.logger.error('socket.vps_live_tick.failed', error as Error, {
        vpsNodeId: event.vpsNodeId,
      });
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
      const traffic = this.trafficLoadService.resolve({
        concurrentRequests: event.metrics.concurrentRequests,
        requestRate: event.metrics.requestRate ?? 0,
      });
      const payload = {
        vpsNodeId: event.vpsNodeId,
        websiteId: event.websiteId,
        domain: event.domain,
        timestamp: event.timestamp,
        traffic,
      };

      this.server
        .to(`website:${event.websiteId}`)
        .emit(EVENT_NAMES.WEBSITE_METRICS_EVALUATED, {
          websiteId: payload.websiteId,
          domain: payload.domain,
          traffic: payload.traffic,
          metrics: event.metrics,
          timestamp: payload.timestamp,
        });

      const monitoringSnapshot =
        await this.realtimeService.getWebsiteMonitoringSnapshot(
          event.websiteId,
        );

      if (monitoringSnapshot) {
        this.server
          .to(`website:${event.websiteId}`)
          .emit(EVENT_NAMES.MONITORING_WEBSITE_TICK, monitoringSnapshot);
      }

      const overviewTick = await this.realtimeService.getOverviewWebsiteTick(
        event.websiteId,
      );

      if (overviewTick) {
        const userId = await this.realtimeService.getUserIdByWebsiteId(
          event.websiteId,
        );

        if (!userId) {
          return;
        }

        this.server
          .to(`user:${userId}`)
          .emit(EVENT_NAMES.OVERVIEW_WEBSITE_TICK, overviewTick);

        await this.emitWebsiteDetailsTickForWebsite(event.websiteId);
      }
    } catch (error: unknown) {
      this.logger.error('socket.website_metrics_stream.failed', error as Error, {
        websiteId: event.websiteId,
        vpsNodeId: event.vpsNodeId,
      });
    }
  }

  // =========================================================
  // STEP 2B — PUBLIC WEBSITE UPTIME STREAM (CORE PROBES)
  // =========================================================
  @OnEvent(EVENT_NAMES.WEBSITE_PROBE_EVALUATED, { async: true })
  async handleWebsiteProbeEvaluated(
    event: WebsiteProbeEvaluatedEvent,
  ): Promise<void> {
    try {
      this.server
        .to(`website:${event.websiteId}`)
        .emit(EVENT_NAMES.WEBSITE_PROBE_EVALUATED, {
          websiteId: event.websiteId,
          domain: event.domain,
          probeSource: event.probeSource,
          availability: event.availability,
          timestamp: event.timestamp,
        });

      const monitoringSnapshot =
        await this.realtimeService.getWebsiteMonitoringSnapshot(
          event.websiteId,
        );

      if (monitoringSnapshot) {
        this.server
          .to(`website:${event.websiteId}`)
          .emit(EVENT_NAMES.MONITORING_WEBSITE_TICK, monitoringSnapshot);
      }

      const overviewTick = await this.realtimeService.getOverviewWebsiteTick(
        event.websiteId,
      );

      if (!overviewTick) {
        return;
      }

      const userId = await this.realtimeService.getUserIdByWebsiteId(
        event.websiteId,
      );

      if (!userId) {
        return;
      }

      this.server
        .to(`user:${userId}`)
        .emit(EVENT_NAMES.OVERVIEW_WEBSITE_TICK, overviewTick);

      await this.emitWebsiteDetailsTickForWebsite(event.websiteId);
    } catch (error: unknown) {
      this.logger.error('socket.website_probe_stream.failed', error as Error, {
        websiteId: event.websiteId,
      });
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

      await this.emitOverviewSnapshotForWebsite(event.websiteId);
      await this.emitWebsiteDetailsTickForWebsite(event.websiteId);
    } catch (error: unknown) {
      this.logger.error('socket.incident_created_stream.failed', error as Error, {
        websiteId: event.websiteId,
        severity: event.severity,
      });
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

      await this.emitOverviewSnapshotForWebsite(event.websiteId);
      await this.emitWebsiteDetailsTickForWebsite(event.websiteId);
    } catch (error: unknown) {
      this.logger.error('socket.incident_resolved_stream.failed', error as Error, {
        websiteId: event.websiteId,
        alertId: event.alertId,
      });
    }
  }

  private async emitWebsiteDetailsTickForWebsite(
    websiteId: string,
  ): Promise<void> {
    const userId = await this.realtimeService.getUserIdByWebsiteId(websiteId);

    if (!userId) {
      return;
    }

    const detailsTick = await this.realtimeService.getWebsiteDetailsTick(
      websiteId,
    );

    if (!detailsTick) {
      return;
    }

    this.server
      .to(`user:${userId}`)
      .emit(EVENT_NAMES.DASHBOARD_WEBSITE_DETAILS_TICK, detailsTick);
  }

  private async emitOverviewSnapshotForWebsite(
    websiteId: string,
  ): Promise<void> {
    const userId = await this.realtimeService.getUserIdByWebsiteId(websiteId);

    if (!userId) {
      return;
    }

    const overviewSnapshot =
      await this.realtimeService.getOverviewSnapshot(userId);

    this.server
      .to(`user:${userId}`)
      .emit(EVENT_NAMES.OVERVIEW_SNAPSHOT, overviewSnapshot);
  }
}
