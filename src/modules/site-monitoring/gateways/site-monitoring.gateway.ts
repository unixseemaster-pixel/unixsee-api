// src/site-monitoring/site-monitoring.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SiteMonitoringService } from './site-monitoring.service';

@WebSocketGateway({
  namespace: '/site-monitoring',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class SiteMonitoringGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SiteMonitoringGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly siteMonitoringService: SiteMonitoringService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;

      if (!token) {
        client.disconnect();
        return;
      }

      const user = await this.siteMonitoringService.verifySocketToken(token);

      if (!user) {
        client.disconnect();
        return;
      }

      client.data.user = user;

      const allowedSiteIds =
        await this.siteMonitoringService.getAllowedSiteIdsForUser(user.id);

      for (const siteId of allowedSiteIds) {
        client.join(`site:${siteId}`);
      }

      client.join(`user:${user.id}`);

      this.logger.log(
        `User ${user.id} connected and joined ${allowedSiteIds.length} site rooms`,
      );
    } catch (error) {
      this.logger.error(`Socket connection failed: ${error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitSiteUpdate(siteId: string, payload: unknown) {
    this.server.to(`site:${siteId}`).emit('site:update', payload);
  }

  emitOwnerUpdate(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('owner:update', payload);
  }
}
