import type { Request } from 'express';

export interface AgentRequest extends Request {
  vpsMachineId: string;
  isFirstProvisioningCycle: boolean;
}
