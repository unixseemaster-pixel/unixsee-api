import { AgentRequest } from '#/common/interfaces/agent-request.interface.js';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export const IsFirstProvisioning = createParamDecorator(
  (_data: unknown, context: ExecutionContext): boolean => {
    const request = context.switchToHttp().getRequest<AgentRequest>();
    return request.isFirstProvisioningCycle ?? false;
  },
);
