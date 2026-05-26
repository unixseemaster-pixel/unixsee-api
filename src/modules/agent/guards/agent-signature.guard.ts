import { createHmac, timingSafeEqual } from 'crypto';
import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class AgentSignatureGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const timestamp = request.headers['x-agent-timestamp'];
    const incomingSignature = request.headers['x-agent-signature'];
    const activationToken = request.headers['x-activation-token'];

    const requestBody = request.body;
    if (!requestBody?.batch?.[0]?.machineId) {
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
        throw new UnauthorizedException(
          'Invalid or expired infrastructure activation token.',
        );
      }

      request.vpsMachineId = machineId;
      request.isFirstProvisioningCycle = true;
      return true;
    }

    if (!timestamp || !incomingSignature) {
      throw new UnauthorizedException(
        'Missing mandatory cryptographic security headers.',
      );
    }

    const requestTime = new Date(timestamp as string).getTime();
    if (
      isNaN(requestTime) ||
      Math.abs(Date.now() - requestTime) > 5 * 60 * 1000
    ) {
      throw new UnauthorizedException('Security timestamp drift detected.');
    }

    const vpsNode = await this.prisma.vpsNode.findUnique({
      where: { machineId },
      select: { secretKey: true },
    });

    if (!vpsNode?.secretKey) {
      throw new UnauthorizedException('Unrecognized host identity signature.');
    }

    const rawPayloadString = JSON.stringify(requestBody);
    const dataToSign = `${timestamp}.${rawPayloadString}`;
    const computedSignature = createHmac('sha256', vpsNode.secretKey)
      .update(dataToSign)
      .digest('hex');

    if (
      !timingSafeEqual(
        Buffer.from(incomingSignature as string, 'hex'),
        Buffer.from(computedSignature, 'hex'),
      )
    ) {
      throw new UnauthorizedException('Invalid cryptographic signature match.');
    }

    request.vpsMachineId = machineId;
    request.isFirstProvisioningCycle = false;
    return true;
  }
}
