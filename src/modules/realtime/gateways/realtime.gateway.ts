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

  // We keep the main hook signature synchronous to protect the engine thread execution context
  handleConnection(client: Socket): void {
    this.initializeSocketSession(client).catch((error) => {
      this.logger.error(
        `Critical socket handshake exception isolated: ${error.message}`,
      );
      client.disconnect(true);
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client downstream subscription terminated: ${client.id}`);
  }

  /**
   * Encapsulated async session handler to securely validate signatures and bind tenant channels.
   */
  private async initializeSocketSession(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token;

    if (!token) {
      this.logger.warn(
        `Connection rejected: Missing auth parameters on socket ${client.id}`,
      );
      client.disconnect(true);
      return;
    }

    const user = await this.realtimeService.verifySocketToken(token);
    if (!user) {
      this.logger.warn(
        `Connection rejected: Invalid signature credentials on socket ${client.id}`,
      );
      client.disconnect(true);
      return;
    }

    // Cache authorization metadata natively inside the volatile socket thread memory map
    client.data.user = user;

    // Fulfill multi-tenant isolation rules: Authorize access to parent VPS node clusters
    const allowedVpsNodeIds =
      await this.realtimeService.getAllowedVpsNodeIdsForUser(user.id);

    for (const vpsNodeId of allowedVpsNodeIds) {
      await client.join(`vps:${vpsNodeId}`);
    }

    // Anchor an isolated user-specific room channel for dedicated alert broadcasts
    await client.join(`user:${user.id}`);

    this.logger.log(
      `Authenticated User ${user.id} bound to room isolation channels: ${allowedVpsNodeIds.length} VPS cluster(s).`,
    );
  }

  /**
   * Asynchronous internal memory event consumer triggered immediately after an agent completes ingestion.
   */
  @OnEvent('metrics.ingested', { async: true })
  async handleMetricsIngestedEvent(
    event: MetricsIngestedEventPayload,
  ): Promise<void> {
    try {
      const { vpsNodeId, batch } = event;

      // Extract volatile instant stats for our merchant and administrator visualization graphs
      for (const entry of batch) {
        const liveVpsTickPayload = {
          timestamp: entry.timestamp,
          metrics: {
            cpuUsagePercent: entry.metrics.cpuMean,
            memoryUsedMB: entry.metrics.ramMeanMB,
            memoryTotalMB: entry.metrics.ramTotalMB,
            liteSpeedConnections: entry.metrics.lsConnectionsPeak,
            diskIops: entry.metrics.diskIopsMean,
          },
          websites: entry.websites.map((site) => ({
            domain: site.domain,
            concurrentRequests: site.peakConcurrentRequests,
          })),
        };

        // Broadcast the real-time ticks exclusively to users locked into this specific authorized VPS room
        this.server
          .to(`vps:${vpsNodeId}`)
          .emit('vps:live_tick', liveVpsTickPayload);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to distribute metrics ingestion streaming update: ${error.message}`,
      );
    }
  }
}
