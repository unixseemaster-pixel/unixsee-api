import { createHmac, timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import type { AgentRequest } from '#/common/interfaces/agent-request.interface.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

const DUMMY_HMAC_SECRET = '0'.repeat(64);

@Injectable()
export class AgentSignatureGuard implements CanActivate {
  private readonly logger = createAppLogger(AgentSignatureGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AgentRequest>();
    const timestamp = this.firstHeaderValue(
      request.headers['x-agent-timestamp'],
    );
    const incomingSignature = this.firstHeaderValue(
      request.headers['x-agent-signature'],
    );
    const requestBody = request.body as
      | { agentInstanceId?: string }
      | undefined;
    const agentInstanceId = requestBody?.agentInstanceId;

    if (!agentInstanceId) {
      this.logger.warn('agent.auth.payload_invalid', {
        ip: request.ip,
        path: request.originalUrl,
      });
      throw new BadRequestException(
        'Invalid payload topology or missing agentInstanceId.',
      );
    }

    if (!timestamp || !incomingSignature) {
      this.logger.warn('agent.auth.headers_missing', {
        agentInstanceId,
        ip: request.ip,
      });
      throw this.authenticationFailed();
    }

    const requestTime = new Date(timestamp).getTime();
    const driftMs = Math.abs(Date.now() - requestTime);
    if (Number.isNaN(requestTime) || driftMs > 5 * 60 * 1000) {
      this.logger.warn('agent.auth.timestamp_drift', {
        agentInstanceId,
        ip: request.ip,
        driftMs,
      });
      throw this.authenticationFailed();
    }

    if (!request.rawBody?.length) {
      this.logger.warn('agent.auth.raw_body_missing', {
        agentInstanceId,
        ip: request.ip,
      });
      throw this.authenticationFailed();
    }

    const vpsNode = await this.prisma.vpsNode.findUnique({
      where: { agentInstanceId },
      select: { secretKey: true, credentialsRevokedAt: true },
    });
    const credentialsUsable = Boolean(
      vpsNode?.secretKey && !vpsNode.credentialsRevokedAt,
    );
    const secretKey = credentialsUsable
      ? vpsNode!.secretKey
      : DUMMY_HMAC_SECRET;
    const computedSignature = createHmac('sha256', secretKey)
      .update(`${timestamp}.${request.rawBody.toString('utf8')}`)
      .digest('hex');

    if (
      !credentialsUsable ||
      !this.safeCompareHex(incomingSignature, computedSignature)
    ) {
      this.logger.warn('agent.auth.rejected', {
        agentInstanceId,
        ip: request.ip,
        credentialsUsable,
      });
      throw this.authenticationFailed();
    }

    request.vpsAgentInstanceId = agentInstanceId;
    this.logger.debug('agent.auth.signature_verified', {
      agentInstanceId,
      ip: request.ip,
    });
    return true;
  }

  private authenticationFailed(): UnauthorizedException {
    return new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
  }

  private firstHeaderValue(
    value: string | string[] | undefined,
  ): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }

  private safeCompareHex(incoming: string, expected: string): boolean {
    if (!/^[a-f0-9]+$/i.test(incoming) || incoming.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(
      Buffer.from(incoming, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  }
}
