import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class AgentSignatureGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const timestamp = request.headers['x-agent-timestamp'];
    const incomingSignature = request.headers['x-agent-signature'];

    if (!timestamp || !incomingSignature) {
      throw new UnauthorizedException(
        'Missing mandatory cryptographic security headers.',
      );
    }

    const requestBody = request.body;
    if (
      !requestBody ||
      !requestBody.batch ||
      !Array.isArray(requestBody.batch) ||
      requestBody.batch.length === 0
    ) {
      throw new BadRequestException('Invalid payload topology.');
    }

    const machineId = requestBody.batch[0].machineId;
    if (!machineId) {
      throw new BadRequestException(
        'Unable to resolve agent machineId fingerprint.',
      );
    }

    const requestTime = new Date(timestamp as string).getTime();
    const currentTime = Date.now();
    const maxAllowedDriftMs = 5 * 60 * 1000;

    if (
      isNaN(requestTime) ||
      Math.abs(currentTime - requestTime) > maxAllowedDriftMs
    ) {
      throw new UnauthorizedException(
        'Security timestamp drift detected. Request rejected.',
      );
    }

    const vpsNode = await this.prisma.vpsNode.findUnique({
      where: { machineId },
      select: { secretKey: true },
    });

    if (!vpsNode || !vpsNode.secretKey) {
      throw new UnauthorizedException('Unrecognized host identity signature.');
    }

    const rawPayloadString = JSON.stringify(requestBody);
    const dataToSign = `${timestamp}.${rawPayloadString}`;

    const computedSignature = createHmac('sha256', vpsNode.secretKey)
      .update(dataToSign)
      .digest('hex');

    const incomingSignatureBuffer = Buffer.from(
      incomingSignature as string,
      'hex',
    );
    const computedSignatureBuffer = Buffer.from(computedSignature, 'hex');

    if (
      incomingSignatureBuffer.length !== computedSignatureBuffer.length ||
      !timingSafeEqual(incomingSignatureBuffer, computedSignatureBuffer)
    ) {
      throw new UnauthorizedException('Invalid cryptographic signature match.');
    }

    request.vpsMachineId = machineId;
    return true;
  }
}
