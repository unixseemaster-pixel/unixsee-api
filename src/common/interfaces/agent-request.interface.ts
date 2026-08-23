import type { Request } from 'express';

export interface AgentRequest extends Request {
  vpsAgentInstanceId: string;
  rawBody?: Buffer;
}
