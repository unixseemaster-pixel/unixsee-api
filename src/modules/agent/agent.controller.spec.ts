import { UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_MESSAGES } from '#/utils/error-messages.js';

import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import type { HeartbeatAgentDto, Phase1IngestDto } from './dto/agent.dto.js';
import { AgentSignatureGuard } from './guards/agent-signature.guard.js';

describe('AgentController', () => {
  let controller: AgentController;

  const agentService = {
    enroll: vi.fn(),
    heartbeat: vi.fn(),
    processPhase1Ingest: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [{ provide: AgentService, useValue: agentService }],
    })
      .overrideGuard(AgentSignatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AgentController);
  });

  describe('enroll', () => {
    it('rejects missing enrollment token', async () => {
      await expect(
        controller.enroll(undefined, { agentInstanceId: 'machine-1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      await expect(
        controller.enroll(undefined, { agentInstanceId: 'machine-1' }),
      ).rejects.toMatchObject({
        message: ERROR_MESSAGES.fa.unauthenticated,
      });
      expect(agentService.enroll).not.toHaveBeenCalled();
    });

    it('uses the first header value when token is an array', async () => {
      agentService.enroll.mockResolvedValue({
        vpsNodeId: 'node-1',
        serverId: 'server-1',
        secretKey: 'secret-hex',
      });

      const response = await controller.enroll(['token-a', 'token-b'], {
        agentInstanceId: 'machine-1',
        agentVersion: '0.1.0',
      });

      expect(agentService.enroll).toHaveBeenCalledWith(
        'token-a',
        'machine-1',
        '0.1.0',
      );
      expect(response).toMatchObject({
        statusCode: 201,
        success: true,
        data: {
          vpsNodeId: 'node-1',
          serverId: 'server-1',
          secretKey: 'secret-hex',
        },
      });
    });

    it('returns created envelope with secretKey', async () => {
      agentService.enroll.mockResolvedValue({
        vpsNodeId: 'node-1',
        serverId: 'server-1',
        secretKey: 'secret-hex',
      });

      const response = await controller.enroll('plain-token', {
        agentInstanceId: 'machine-1',
      });

      expect(agentService.enroll).toHaveBeenCalledWith(
        'plain-token',
        'machine-1',
        undefined,
      );
      expect(response.data).toEqual({
        vpsNodeId: 'node-1',
        serverId: 'server-1',
        secretKey: 'secret-hex',
      });
    });
  });

  describe('heartbeat', () => {
    it('returns ok envelope from service result', async () => {
      const body: HeartbeatAgentDto = {
        schemaVersion: 'phase1',
        agentInstanceId: 'machine-1',
        sentAt: '2026-08-09T12:00:00.000Z',
      };
      const updated = {
        id: 'node-1',
        agentInstanceId: 'machine-1',
        status: 'ONLINE',
      };
      agentService.heartbeat.mockResolvedValue(updated);

      const response = await controller.heartbeat(body);

      expect(agentService.heartbeat).toHaveBeenCalledWith(body);
      expect(response).toMatchObject({
        statusCode: 200,
        success: true,
        data: updated,
      });
    });
  });

  describe('ingest', () => {
    it('returns created envelope from phase1 ingest result', async () => {
      const payload: Phase1IngestDto = {
        schemaVersion: 'phase1',
        agentInstanceId: 'machine-1',
        sentAt: '2026-08-09T12:00:00.000Z',
        discoveries: [],
      };
      const result = {
        vpsNodeId: 'node-1',
        discoveryCount: 0,
        visitorSamplesInserted: 0,
      };
      agentService.processPhase1Ingest.mockResolvedValue(result);

      const response = await controller.ingest(payload);

      expect(agentService.processPhase1Ingest).toHaveBeenCalledWith(payload);
      expect(response).toMatchObject({
        statusCode: 201,
        success: true,
        data: result,
      });
    });
  });
});
