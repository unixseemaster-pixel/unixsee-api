import { createHmac } from 'node:crypto';

import {
  BadRequestException,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { GlobalExceptionFilter } from '#/common/http/filters/global-exception.filter.js';
import { DiscoveryStatus, VpsNodeStatus } from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ServersService } from '#/modules/servers/services/servers.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

import { AgentController } from '../src/modules/agent/agent.controller.js';
import { AgentService } from '../src/modules/agent/agent.service.js';
import { AgentSignatureGuard } from '../src/modules/agent/guards/agent-signature.guard.js';

const MACHINE_ID = 'e2e-machine-1';
const SERVER_ID = 'server-e2e-1';
const VPS_NODE_ID = 'node-e2e-1';
const ENROLLMENT_TOKEN = 'enrollment-token-plain';
const SECRET_KEY = 'b'.repeat(64);

function signAgentBody(secretKey: string, timestamp: string, body: unknown) {
  return createHmac('sha256', secretKey)
    .update(`${timestamp}.${JSON.stringify(body)}`)
    .digest('hex');
}

describe('AgentModule (e2e)', () => {
  let app: INestApplication;

  const prisma = {
    vpsNode: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    websiteDiscovery: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    websiteActiveVisitorSample: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const serversService = {
    enrollWithToken: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AgentController],
      providers: [
        AgentService,
        AgentSignatureGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: ServersService, useValue: serversService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );

    prisma.vpsNode.findUnique.mockResolvedValue({
      id: VPS_NODE_ID,
      serverId: SERVER_ID,
      secretKey: SECRET_KEY,
      credentialsRevokedAt: null,
    });
    prisma.vpsNode.update.mockImplementation(async ({ data, select }) => ({
      id: VPS_NODE_ID,
      agentInstanceId: MACHINE_ID,
      lastHeartbeatAt: data.lastHeartbeatAt ?? new Date(),
      lastSeenAt: data.lastSeenAt ?? new Date(),
      status: data.status ?? VpsNodeStatus.ONLINE,
      agentVersion: data.agentVersion ?? '0.1.0',
      ...(select ? {} : {}),
    }));
    prisma.websiteDiscovery.upsert.mockResolvedValue({
      id: 'discovery-1',
      domain: 'example.com',
    });
    prisma.websiteDiscovery.findUnique.mockResolvedValue({
      websiteId: 'website-1',
    });
    prisma.websiteActiveVisitorSample.createMany.mockResolvedValue({
      count: 1,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/internal/agent/v1/enroll', () => {
    it('returns 401 when enrollment token header is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/internal/agent/v1/enroll')
        .send({ agentInstanceId: MACHINE_ID })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        statusCode: 401,
        error: expect.objectContaining({
          message: ERROR_MESSAGES.fa.unauthenticated,
        }),
      });
      expect(serversService.enrollWithToken).not.toHaveBeenCalled();
    });

    it('returns 400 when agentInstanceId is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/enroll')
        .set('x-enrollment-token', ENROLLMENT_TOKEN)
        .send({})
        .expect(400);

      expect(serversService.enrollWithToken).not.toHaveBeenCalled();
    });

    it('enrolls with token and returns secretKey once', async () => {
      serversService.enrollWithToken.mockResolvedValue({
        vpsNodeId: VPS_NODE_ID,
        serverId: SERVER_ID,
        secretKey: SECRET_KEY,
      });
      prisma.vpsNode.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/api/internal/agent/v1/enroll')
        .set('x-enrollment-token', ENROLLMENT_TOKEN)
        .send({ agentInstanceId: MACHINE_ID, agentVersion: '0.1.0' })
        .expect(201);

      expect(serversService.enrollWithToken).toHaveBeenCalledWith(
        ENROLLMENT_TOKEN,
        MACHINE_ID,
        '0.1.0',
      );
      expect(response.body).toMatchObject({
        success: true,
        statusCode: 201,
        data: {
          vpsNodeId: VPS_NODE_ID,
          serverId: SERVER_ID,
          secretKey: SECRET_KEY,
        },
      });
      expect(prisma.vpsNode.update).not.toHaveBeenCalled();
    });

    it('propagates invalid enrollment token failures', async () => {
      serversService.enrollWithToken.mockRejectedValue(
        new BadRequestException(ERROR_MESSAGES.fa.validation),
      );

      const response = await request(app.getHttpServer())
        .post('/api/internal/agent/v1/enroll')
        .set('x-enrollment-token', 'bad-token')
        .send({ agentInstanceId: MACHINE_ID })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/internal/agent/v1/heartbeat', () => {
    it('rejects requests without HMAC headers', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/internal/agent/v1/heartbeat')
        .send({
          schemaVersion: 'phase1',
          agentInstanceId: MACHINE_ID,
          sentAt: new Date().toISOString(),
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('rejects invalid payloads before signature checks complete meaningfully', async () => {
      const timestamp = new Date().toISOString();
      const body = { agentInstanceId: MACHINE_ID, sentAt: timestamp };
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/heartbeat')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(400);
    });

    it('accepts a valid signed heartbeat', async () => {
      const sentAt = new Date().toISOString();
      const body = {
        schemaVersion: 'phase1',
        agentInstanceId: MACHINE_ID,
        agentVersion: '0.1.0',
        serverBinding: { hostname: 'vps.example' },
        sentAt,
      };
      const timestamp = new Date().toISOString();
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      const response = await request(app.getHttpServer())
        .post('/api/internal/agent/v1/heartbeat')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        statusCode: 200,
        data: expect.objectContaining({
          id: VPS_NODE_ID,
          agentInstanceId: MACHINE_ID,
          status: VpsNodeStatus.ONLINE,
        }),
      });
      expect(prisma.vpsNode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { agentInstanceId: MACHINE_ID },
          data: expect.objectContaining({
            status: VpsNodeStatus.ONLINE,
            hostname: 'vps.example',
            agentVersion: '0.1.0',
          }),
        }),
      );
    });

    it('rejects bad signatures', async () => {
      const sentAt = new Date().toISOString();
      const body = {
        schemaVersion: 'phase1',
        agentInstanceId: MACHINE_ID,
        sentAt,
      };
      const timestamp = new Date().toISOString();

      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/heartbeat')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', 'c'.repeat(64))
        .send(body)
        .expect(401);
    });
  });

  describe('POST /api/internal/agent/v1/ingest', () => {
    it('accepts a valid signed phase1 ingest payload', async () => {
      const sentAt = new Date().toISOString();
      const body = {
        schemaVersion: 'phase1',
        agentInstanceId: MACHINE_ID,
        agentVersion: '0.1.0',
        sentAt,
        discoveries: [
          {
            domain: 'example.com',
            documentRoot: '/home/user/domains/example.com/public_html',
            owner: 'user',
            appType: 'wordpress',
            source: 'openlitespeed',
            aliases: ['www.example.com'],
          },
        ],
        activeVisitors3m: [
          {
            domain: 'example.com',
            uniqueIpCount: 4,
            windowSeconds: 180,
            windowStartedAt: new Date(Date.now() - 180_000).toISOString(),
            measuredAt: sentAt,
          },
        ],
      };
      const timestamp = new Date().toISOString();
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      const response = await request(app.getHttpServer())
        .post('/api/internal/agent/v1/ingest')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        statusCode: 201,
        data: {
          vpsNodeId: VPS_NODE_ID,
          discoveryCount: 1,
          visitorSamplesInserted: 1,
        },
      });
      expect(prisma.websiteDiscovery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            domain: 'example.com',
            status: DiscoveryStatus.NEW,
            homeDirectory: '/home/user',
          }),
        }),
      );
      expect(prisma.websiteActiveVisitorSample.createMany).toHaveBeenCalled();
    });

    it('rejects monitor-shaped legacy batch ingest', async () => {
      const body = {
        batch: [
          {
            agentInstanceId: MACHINE_ID,
            timestamp: new Date().toISOString(),
            metrics: { cpuMean: 1 },
            websites: [],
          },
        ],
      };
      const timestamp = new Date().toISOString();
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/ingest')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(400);
    });

    it('rejects ingest with more than 200 discoveries', async () => {
      const sentAt = new Date().toISOString();
      const body = {
        schemaVersion: 'phase1',
        agentInstanceId: MACHINE_ID,
        sentAt,
        discoveries: Array.from({ length: 201 }, (_, index) => ({
          domain: `site-${index}.example.com`,
          documentRoot: `/home/user/domains/site-${index}.example.com/public_html`,
          appType: 'static',
          source: 'openlitespeed',
        })),
      };
      const timestamp = new Date().toISOString();
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/ingest')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(400);
    });

    it('rejects non-HTTPS management URLs', async () => {
      const sentAt = new Date().toISOString();
      const body = {
        schemaVersion: 'phase1',
        agentInstanceId: MACHINE_ID,
        sentAt,
        discoveries: [
          {
            domain: 'example.com',
            documentRoot: '/home/user/domains/example.com/public_html',
            appType: 'wordpress',
            source: 'openlitespeed',
            controlPanelUrl: 'javascript:alert(1)',
            wordpressAdminUrl: 'http://example.com/wp-admin/',
          },
        ],
      };
      const timestamp = new Date().toISOString();
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/ingest')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(400);
    });

    it('rejects invalid fieldStatus map entries', async () => {
      const sentAt = new Date().toISOString();
      const body = {
        schemaVersion: 'phase1',
        agentInstanceId: MACHINE_ID,
        sentAt,
        discoveries: [
          {
            domain: 'example.com',
            documentRoot: '/home/user/domains/example.com/public_html',
            appType: 'wordpress',
            source: 'openlitespeed',
            fieldStatus: {
              wordpressVersion: { state: 'invented' },
            },
          },
        ],
      };
      const timestamp = new Date().toISOString();
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/ingest')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(400);
    });

    it('accepts HTTPS management URLs', async () => {
      const sentAt = new Date().toISOString();
      const body = {
        schemaVersion: 'phase1',
        agentInstanceId: MACHINE_ID,
        agentVersion: '0.1.0',
        sentAt,
        discoveries: [
          {
            domain: 'example.com',
            documentRoot: '/home/user/domains/example.com/public_html',
            owner: 'user',
            appType: 'wordpress',
            source: 'openlitespeed',
            controlPanelUrl: 'https://host.example:2222',
            wordpressAdminUrl: 'https://example.com/wp-admin/',
          },
        ],
      };
      const timestamp = new Date().toISOString();
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/ingest')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(201);
    });

    it('rejects zero uniqueIpCount without status', async () => {
      const sentAt = new Date().toISOString();
      const body = {
        schemaVersion: 'phase1',
        agentInstanceId: MACHINE_ID,
        sentAt,
        discoveries: [
          {
            domain: 'example.com',
            documentRoot: '/home/user/domains/example.com/public_html',
            appType: 'wordpress',
            source: 'openlitespeed',
          },
        ],
        activeVisitors3m: [
          {
            domain: 'example.com',
            uniqueIpCount: 0,
            windowSeconds: 180,
            windowStartedAt: new Date(Date.now() - 180_000).toISOString(),
            measuredAt: sentAt,
          },
        ],
      };
      const timestamp = new Date().toISOString();
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/ingest')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(400);
    });

    it('accepts zero uniqueIpCount with unsupported status', async () => {
      const sentAt = new Date().toISOString();
      const body = {
        schemaVersion: 'phase1',
        agentInstanceId: MACHINE_ID,
        sentAt,
        discoveries: [
          {
            domain: 'example.com',
            documentRoot: '/home/user/domains/example.com/public_html',
            appType: 'wordpress',
            source: 'openlitespeed',
          },
        ],
        activeVisitors3m: [
          {
            domain: 'example.com',
            uniqueIpCount: 0,
            windowSeconds: 180,
            windowStartedAt: new Date(Date.now() - 180_000).toISOString(),
            measuredAt: sentAt,
            status: { state: 'unsupported', reason: 'log_missing' },
          },
        ],
      };
      const timestamp = new Date().toISOString();
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/ingest')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(201);
    });

    it('accepts zero uniqueIpCount with ok status for empty readable windows', async () => {
      const sentAt = new Date().toISOString();
      const body = {
        schemaVersion: 'phase1',
        agentInstanceId: MACHINE_ID,
        sentAt,
        discoveries: [
          {
            domain: 'example.com',
            documentRoot: '/home/user/domains/example.com/public_html',
            appType: 'wordpress',
            source: 'openlitespeed',
          },
        ],
        activeVisitors3m: [
          {
            domain: 'example.com',
            uniqueIpCount: 0,
            windowSeconds: 180,
            windowStartedAt: new Date(Date.now() - 180_000).toISOString(),
            measuredAt: sentAt,
            status: { state: 'ok' },
          },
        ],
      };
      const timestamp = new Date().toISOString();
      const signature = signAgentBody(SECRET_KEY, timestamp, body);

      await request(app.getHttpServer())
        .post('/api/internal/agent/v1/ingest')
        .set('x-agent-timestamp', timestamp)
        .set('x-agent-signature', signature)
        .send(body)
        .expect(201);
    });
  });
});
