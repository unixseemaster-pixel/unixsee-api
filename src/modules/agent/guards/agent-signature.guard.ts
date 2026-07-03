import { createHmac, timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { createAppLogger } from '#/common/logging/app-logger.js';
import type { AgentRequest } from '#/common/interfaces/agent-request.interface.js';

@Injectable()
export class AgentSignatureGuard implements CanActivate {
  private readonly logger = createAppLogger(AgentSignatureGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AgentRequest>();
    const timestamp = request.headers['x-agent-timestamp'];
    const incomingSignature = request.headers['x-agent-signature'];
    const activationToken = request.headers['x-activation-token'];

    const requestBody = request.body;
    if (!requestBody?.batch?.[0]?.machineId) {
      this.logger.warn('agent.auth.payload_invalid', {
        ip: request.ip,
        path: request.originalUrl,
      });
      throw new BadRequestException(
        'Invalid payload topology or missing machineId.',
      );
    }

    const machineId = requestBody.batch[0].machineId;

    if (activationToken && !incomingSignature) {
      const configuredActivationToken = this.configService.get<string>(
        'AGENT_ACTIVATION_TOKEN',
      );
      if (
        !configuredActivationToken ||
        activationToken !== configuredActivationToken
      ) {
        this.logger.warn('agent.auth.activation_token_invalid', {
          machineId,
          ip: request.ip,
        });
        throw new UnauthorizedException(
          'Invalid or expired infrastructure activation token.',
        );
      }

      request.vpsMachineId = machineId;
      request.isFirstProvisioningCycle = true;

      this.logger.log('agent.auth.activation_token_accepted', {
        machineId,
        ip: request.ip,
      });
      return true;
    }

    if (!timestamp || !incomingSignature) {
      this.logger.warn('agent.auth.headers_missing', {
        machineId,
        ip: request.ip,
        hasTimestamp: Boolean(timestamp),
        hasSignature: Boolean(incomingSignature),
      });
      throw new UnauthorizedException(
        'Missing mandatory cryptographic security headers.',
      );
    }

    const normalizedTimestamp = this.firstHeaderValue(timestamp);
    const normalizedSignature = this.firstHeaderValue(incomingSignature);
    const requestTime = new Date(normalizedTimestamp).getTime();
    const driftMs = Math.abs(Date.now() - requestTime);

    if (isNaN(requestTime) || driftMs > 5 * 60 * 1000) {
      this.logger.warn('agent.auth.timestamp_drift', {
        machineId,
        ip: request.ip,
        driftMs,
      });
      throw new UnauthorizedException('Security timestamp drift detected.');
    }

    const vpsNode = await this.prisma.vpsNode.findUnique({
      where: { machineId },
      select: { secretKey: true },
    });

    if (!vpsNode?.secretKey) {
      this.logger.warn('agent.auth.machine_unknown', {
        machineId,
        ip: request.ip,
      });
      throw new UnauthorizedException('Unrecognized host identity signature.');
    }

    const rawPayloadString = JSON.stringify(requestBody);
    const dataToSign = `${normalizedTimestamp}.${rawPayloadString}`;
    const computedSignature = createHmac('sha256', vpsNode.secretKey)
      .update(dataToSign)
      .digest('hex');

    if (!this.safeCompareHex(normalizedSignature, computedSignature)) {
      this.logger.warn('agent.auth.signature_invalid', {
        machineId,
        ip: request.ip,
      });
      throw new UnauthorizedException('Invalid cryptographic signature match.');
    }

    request.vpsMachineId = machineId;
    request.isFirstProvisioningCycle = false;

    this.logger.debug('agent.auth.signature_verified', {
      machineId,
      ip: request.ip,
    });
    return true;
  }

  private firstHeaderValue(value: string | string[]): string {
    return Array.isArray(value) ? value[0] : value;
  }

  private safeCompareHex(incoming: string, expected: string): boolean {
    if (!/^[a-f0-9]+$/i.test(incoming) || incoming.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(incoming, 'hex'), Buffer.from(expected, 'hex'));
  }
}
