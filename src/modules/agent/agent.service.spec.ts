import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AgentCommandStatus,
  VpsNodeStatus,
} from '#/generated/prisma/client.js';
import { AgentService } from './agent.service.js';

const agent = {
  id: 'node-1',
  serverId: 'server-1',
  credentialsRevokedAt: null,
  secretKey: 'secret',
};
describe('AgentService v0.2', () => {
  const prisma: any = {
    vpsNode: { findUnique: vi.fn(), update: vi.fn() },
    websiteDiscovery: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    websiteTrafficSnapshot: { upsert: vi.fn() },
    websiteActiveVisitorSample: { createMany: vi.fn() },
    agentCommand: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const servers: any = { enrollWithToken: vi.fn() };
  let service: AgentService;
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );
    prisma.vpsNode.findUnique.mockResolvedValue(agent);
    prisma.vpsNode.update.mockResolvedValue({
      id: agent.id,
      agentInstanceId: 'instance-1',
      status: VpsNodeStatus.ONLINE,
      lastHeartbeatAt: new Date(),
    });
    prisma.agentCommand.updateMany.mockResolvedValue({ count: 1 });
    prisma.agentCommand.findMany.mockResolvedValue([]);
    prisma.websiteDiscovery.updateMany.mockResolvedValue({ count: 0 });
    prisma.websiteDiscovery.findUnique.mockResolvedValue({
      id: 'disc-1',
      websiteId: 'site-1',
    });
    prisma.websiteTrafficSnapshot.upsert.mockResolvedValue({});
    service = new AgentService(prisma, servers);
  });
  it('uses the hard-cutover installation identity for enrollment and heartbeat', async () => {
    servers.enrollWithToken.mockResolvedValue({ secretKey: 'new' });
    await service.enroll('token', 'instance-1', '0.2.0');
    expect(servers.enrollWithToken).toHaveBeenCalledWith(
      'token',
      'instance-1',
      '0.2.0',
    );
    const result = await service.heartbeat({
      schemaVersion: 'phase1',
      agentInstanceId: 'instance-1',
      agentVersion: '0.2.0',
      sentAt: new Date().toISOString(),
    });
    expect(result.agent.agentInstanceId).toBe('instance-1');
    expect(prisma.vpsNode.update.mock.calls[0][0].data).not.toHaveProperty(
      'hostname',
    );
  });
  it('reconciles an explicitly empty inventory snapshot', async () => {
    await service.processPhase1Ingest({
      schemaVersion: 'phase1',
      agentInstanceId: 'instance-1',
      sentAt: new Date().toISOString(),
      discoveries: [],
    });
    expect(prisma.websiteDiscovery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPresent: false }),
      }),
    );
  });
  it('protects admin URLs and upserts latest traffic without legacy history', async () => {
    await service.processPhase1Ingest({
      schemaVersion: 'phase1',
      agentInstanceId: 'instance-1',
      sentAt: new Date().toISOString(),
      discoveries: [
        {
          domain: 'example.com',
          aliases: [],
          virtualHostName: 'vh',
          source: 'openlitespeed',
          discoveredAt: new Date().toISOString(),
        },
      ],
      activeVisitors3m: [
        {
          domain: 'example.com',
          uniqueVisitorCount: 2,
          windowSeconds: 180,
          windowStartedAt: new Date().toISOString(),
          measuredAt: new Date().toISOString(),
          status: { state: 'ok' },
        },
      ],
    });
    const create = prisma.websiteDiscovery.upsert.mock.calls[0][0].create;
    expect(create).not.toHaveProperty('controlPanelUrl');
    expect(create).not.toHaveProperty('wordpressAdminUrl');
    expect(prisma.websiteTrafficSnapshot.upsert).toHaveBeenCalledOnce();
    expect(prisma.websiteActiveVisitorSample.createMany).not.toHaveBeenCalled();
  });
  it('preserves last-good stack fields on a failed field attempt', async () => {
    await service.processPhase1Ingest({
      schemaVersion: 'phase1',
      agentInstanceId: 'instance-1',
      sentAt: new Date().toISOString(),
      siteStacks: [
        {
          domain: 'example.com',
          wordpressVersion: null,
          phpVersion: '8.3.12',
          imagickVersion: null,
          checkedAt: new Date().toISOString(),
          fieldStatus: {
            wordpressVersion: { state: 'unknown', reason: 'timeout' },
            phpVersion: { state: 'ok' },
            imagickVersion: { state: 'unsupported' },
          },
        },
      ],
    });
    const data = prisma.websiteDiscovery.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('wordpressVersion');
    expect(data.phpVersion).toBe('8.3.12');
    expect(data.fieldStatus.wordpressVersion.reason).toBe('timeout');
  });
  it('rejects a result that is not bound to a live command lease', async () => {
    prisma.agentCommand.findUnique.mockResolvedValue({
      id: 'cmd-1',
      vpsNodeId: 'node-1',
      discoveryId: 'disc-1',
      domain: 'example.com',
      status: AgentCommandStatus.RUNNING,
      leaseExpiresAt: new Date(Date.now() - 1_000),
    });

    await expect(
      service.submitCommandResult('cmd-1', {
        agentInstanceId: 'instance-1',
        status: 'FAILED',
        finishedAt: new Date().toISOString(),
        errorCode: 'PROBE_TIMEOUT',
      }),
    ).rejects.toThrow();
    expect(prisma.websiteDiscovery.update).not.toHaveBeenCalled();
  });

  it('records a failed refresh attempt without replacing last-good stack values', async () => {
    prisma.agentCommand.findUnique.mockResolvedValue({
      id: 'cmd-1',
      vpsNodeId: 'node-1',
      discoveryId: 'disc-1',
      domain: 'example.com',
      status: AgentCommandStatus.RUNNING,
      leaseExpiresAt: new Date(Date.now() + 60_000),
    });
    prisma.agentCommand.update.mockResolvedValue({
      id: 'cmd-1',
      status: AgentCommandStatus.FAILED,
    });

    await service.submitCommandResult('cmd-1', {
      agentInstanceId: 'instance-1',
      status: 'FAILED',
      finishedAt: new Date().toISOString(),
      errorCode: 'PROBE_TIMEOUT',
    });

    const attempt = prisma.websiteDiscovery.update.mock.calls[0][0].data;
    expect(attempt).not.toHaveProperty('wordpressVersion');
    expect(attempt).not.toHaveProperty('phpVersion');
    expect(attempt).not.toHaveProperty('imagickVersion');
    expect(attempt).not.toHaveProperty('stackLastSucceededAt');
    expect(attempt.fieldStatus.probe.reason).toBe('PROBE_TIMEOUT');
  });
  it('treats a duplicate terminal command result idempotently', async () => {
    prisma.agentCommand.findUnique.mockResolvedValue({
      id: 'cmd-1',
      vpsNodeId: 'node-1',
      status: AgentCommandStatus.SUCCEEDED,
    });
    const result = await service.submitCommandResult('cmd-1', {
      agentInstanceId: 'instance-1',
      status: 'SUCCEEDED',
      finishedAt: new Date().toISOString(),
    });
    expect(result.status).toBe(AgentCommandStatus.SUCCEEDED);
    expect(prisma.agentCommand.update).not.toHaveBeenCalled();
  });
});
