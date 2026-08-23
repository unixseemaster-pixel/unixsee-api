import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EnrollmentTokenStatus,
  VpsNodeStatus,
} from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

import { ServersService } from './servers.service.js';

describe('ServersService.enrollWithToken', () => {
  let service: ServersService;

  const prisma = {
    serverEnrollmentToken: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServersService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: vi.fn((key: string) => {
              if (key === 'app.agentApiBaseUrl') {
                return 'https://core.unixsee.com';
              }
              throw new Error(`Unexpected config key: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ServersService);
  });

  it('rejects when conditional token consume finds zero rows', async () => {
    prisma.serverEnrollmentToken.findUnique.mockResolvedValue({
      id: 'token-1',
      serverId: 'server-1',
      status: EnrollmentTokenStatus.ACTIVE,
      expiresAt: null,
    });

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        serverEnrollmentToken: {
          updateMany: vi
            .fn()
            .mockResolvedValueOnce({ count: 0 })
            .mockResolvedValueOnce({ count: 0 }),
        },
        vpsNode: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
          create: vi.fn(),
        },
      };
      return callback(tx);
    });

    await expect(
      service.enrollWithToken('plain-token', 'machine-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cross-server agentInstanceId with generic validation error before consume', async () => {
    prisma.serverEnrollmentToken.findUnique.mockResolvedValue({
      id: 'token-1',
      serverId: 'server-a',
      status: EnrollmentTokenStatus.ACTIVE,
      expiresAt: null,
    });

    const updateMany = vi.fn();

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        serverEnrollmentToken: {
          updateMany,
        },
        vpsNode: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'node-1',
            serverId: 'server-b',
          }),
          update: vi.fn(),
          create: vi.fn(),
        },
      };
      return callback(tx);
    });

    await expect(
      service.enrollWithToken('plain-token', 'machine-1'),
    ).rejects.toMatchObject({
      message: ERROR_MESSAGES.fa.validation,
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rotates secret for same-server re-provision', async () => {
    prisma.serverEnrollmentToken.findUnique.mockResolvedValue({
      id: 'token-1',
      serverId: 'server-1',
      status: EnrollmentTokenStatus.ACTIVE,
      expiresAt: null,
    });

    const update = vi.fn().mockResolvedValue({
      id: 'node-1',
      serverId: 'server-1',
    });

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        serverEnrollmentToken: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        vpsNode: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'node-1',
            serverId: 'server-1',
          }),
          update,
          create: vi.fn(),
        },
      };
      return callback(tx);
    });

    const result = await service.enrollWithToken('plain-token', 'machine-1');

    expect(result).toMatchObject({
      vpsNodeId: 'node-1',
      serverId: 'server-1',
    });
    expect(result.secretKey).toHaveLength(64);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentInstanceId: 'machine-1' },
        data: expect.objectContaining({
          status: VpsNodeStatus.ONLINE,
          credentialsRevokedAt: null,
          secretKey: result.secretKey,
        }),
      }),
    );
    expect(update.mock.calls[0][0].data.serverId).toBeUndefined();
  });

  it('persists agentVersion inside the same enrollment transaction', async () => {
    prisma.serverEnrollmentToken.findUnique.mockResolvedValue({
      id: 'token-1',
      serverId: 'server-1',
      status: EnrollmentTokenStatus.ACTIVE,
      expiresAt: null,
    });

    const create = vi.fn().mockResolvedValue({
      id: 'node-1',
      serverId: 'server-1',
    });

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        serverEnrollmentToken: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        vpsNode: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
          create,
        },
      };
      return callback(tx);
    });

    await service.enrollWithToken('plain-token', 'machine-1', '0.1.0');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agentVersion: '0.1.0',
          agentInstanceId: 'machine-1',
        }),
      }),
    );
  });
});

describe('ServersService.delete', () => {
  let service: ServersService;

  const prisma = {
    server: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    website: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServersService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: vi.fn((key: string) => {
              if (key === 'app.agentApiBaseUrl') {
                return 'https://core.unixsee.com';
              }
              throw new Error(`Unexpected config key: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ServersService);
  });

  it('revokes active tokens and blanks agent secrets before deleting the server', async () => {
    prisma.server.findUnique.mockResolvedValue({ id: 'server-1' });
    prisma.website.count.mockResolvedValue(0);

    const updateTokens = vi.fn().mockResolvedValue({ count: 2 });
    const updateNodes = vi.fn().mockResolvedValue({ count: 1 });
    const deleteServer = vi.fn().mockResolvedValue({ id: 'server-1' });

    prisma.$transaction.mockImplementation(async (callback) => {
      return callback({
        serverEnrollmentToken: { updateMany: updateTokens },
        vpsNode: { updateMany: updateNodes },
        server: { delete: deleteServer },
      });
    });

    await expect(service.delete('server-1')).resolves.toEqual({
      id: 'server-1',
      revokedTokenCount: 2,
      disabledNodeCount: 1,
    });

    expect(updateTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          serverId: 'server-1',
          status: EnrollmentTokenStatus.ACTIVE,
        },
        data: expect.objectContaining({
          status: EnrollmentTokenStatus.REVOKED,
        }),
      }),
    );
    expect(updateNodes).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { serverId: 'server-1' },
        data: expect.objectContaining({
          secretKey: '',
          status: VpsNodeStatus.OFFLINE,
          credentialsRevokedReason: 'server.deleted',
        }),
      }),
    );
    expect(deleteServer).toHaveBeenCalledWith({ where: { id: 'server-1' } });
  });

  it('rejects delete when websites are still bound to the server nodes', async () => {
    prisma.server.findUnique.mockResolvedValue({ id: 'server-1' });
    prisma.website.count.mockResolvedValue(3);
    prisma.$transaction.mockResolvedValue(undefined);

    await expect(service.delete('server-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
