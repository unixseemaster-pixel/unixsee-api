import { createHmac } from 'node:crypto';

import {
  BadRequestException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';

import { AgentSignatureGuard } from './agent-signature.guard.js';

function signRaw(
  secretKey: string,
  timestamp: string,
  rawBody: string,
): string {
  return createHmac('sha256', secretKey)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
}

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('AgentSignatureGuard', () => {
  let guard: AgentSignatureGuard;

  const prisma = {
    vpsNode: {
      findUnique: vi.fn(),
    },
  };

  const secretKey = 'a'.repeat(64);
  const body = {
    schemaVersion: 'phase1',
    agentInstanceId: 'machine-1',
    sentAt: '2026-08-09T12:00:00.000Z',
  };
  const rawBodyString = JSON.stringify(body);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentSignatureGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get(AgentSignatureGuard);
  });

  it('accepts a valid HMAC signature over rawBody and stamps vpsAgentInstanceId', async () => {
    const now = new Date('2026-08-09T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const timestamp = now.toISOString();
    const signature = signRaw(secretKey, timestamp, rawBodyString);
    const request = {
      body,
      rawBody: Buffer.from(rawBodyString, 'utf8'),
      headers: {
        'x-agent-timestamp': timestamp,
        'x-agent-signature': signature,
      },
      ip: '127.0.0.1',
      originalUrl: '/api/internal/agent/v1/heartbeat',
    };

    prisma.vpsNode.findUnique.mockResolvedValue({
      secretKey,
      credentialsRevokedAt: null,
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request).toMatchObject({ vpsAgentInstanceId: 'machine-1' });
  });

  it('rejects missing agentInstanceId', async () => {
    const request = {
      body: {},
      rawBody: Buffer.from('{}', 'utf8'),
      headers: {},
      ip: '127.0.0.1',
      originalUrl: '/api/internal/agent/v1/heartbeat',
    };

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing auth headers with uniform auth failure', async () => {
    const request = {
      body,
      rawBody: Buffer.from(rawBodyString, 'utf8'),
      headers: {},
      ip: '127.0.0.1',
      originalUrl: '/api/internal/agent/v1/heartbeat',
    };

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toMatchObject({
      message: ERROR_MESSAGES.fa.unauthenticated,
    });
  });

  it('rejects timestamp drift with uniform auth failure', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T12:00:00.000Z'));

    const timestamp = new Date('2026-08-09T11:50:00.000Z').toISOString();
    const signature = signRaw(secretKey, timestamp, rawBodyString);
    const request = {
      body,
      rawBody: Buffer.from(rawBodyString, 'utf8'),
      headers: {
        'x-agent-timestamp': timestamp,
        'x-agent-signature': signature,
      },
      ip: '127.0.0.1',
      originalUrl: '/api/internal/agent/v1/heartbeat',
    };

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toMatchObject({
      message: ERROR_MESSAGES.fa.unauthenticated,
    });
    expect(prisma.vpsNode.findUnique).not.toHaveBeenCalled();
  });

  it('rejects unknown or revoked credentials with the same auth error as bad signatures', async () => {
    const now = new Date('2026-08-09T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const timestamp = now.toISOString();
    const signature = signRaw(secretKey, timestamp, rawBodyString);
    const request = {
      body,
      rawBody: Buffer.from(rawBodyString, 'utf8'),
      headers: {
        'x-agent-timestamp': timestamp,
        'x-agent-signature': signature,
      },
      ip: '127.0.0.1',
      originalUrl: '/api/internal/agent/v1/heartbeat',
    };

    prisma.vpsNode.findUnique.mockResolvedValue({
      secretKey: '',
      credentialsRevokedAt: new Date(),
    });

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toMatchObject({
      message: ERROR_MESSAGES.fa.unauthenticated,
    });
  });

  it('rejects invalid signatures with the same auth error as unknown hosts', async () => {
    const now = new Date('2026-08-09T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const timestamp = now.toISOString();
    const request = {
      body,
      rawBody: Buffer.from(rawBodyString, 'utf8'),
      headers: {
        'x-agent-timestamp': timestamp,
        'x-agent-signature': 'b'.repeat(64),
      },
      ip: '127.0.0.1',
      originalUrl: '/api/internal/agent/v1/heartbeat',
    };

    prisma.vpsNode.findUnique.mockResolvedValue({
      secretKey,
      credentialsRevokedAt: null,
    });

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toMatchObject({
      message: ERROR_MESSAGES.fa.unauthenticated,
    });
  });

  it('rejects unknown agentInstanceId with the same auth error as bad signatures', async () => {
    const now = new Date('2026-08-09T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const timestamp = now.toISOString();
    const signature = signRaw(secretKey, timestamp, rawBodyString);
    const request = {
      body,
      rawBody: Buffer.from(rawBodyString, 'utf8'),
      headers: {
        'x-agent-timestamp': timestamp,
        'x-agent-signature': signature,
      },
      ip: '127.0.0.1',
      originalUrl: '/api/internal/agent/v1/heartbeat',
    };

    prisma.vpsNode.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toMatchObject({
      message: ERROR_MESSAGES.fa.unauthenticated,
    });
  });

  it('rejects missing rawBody even when re-serialized body would match', async () => {
    const now = new Date('2026-08-09T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const timestamp = now.toISOString();
    const signature = signRaw(secretKey, timestamp, rawBodyString);
    const request = {
      body,
      headers: {
        'x-agent-timestamp': timestamp,
        'x-agent-signature': signature,
      },
      ip: '127.0.0.1',
      originalUrl: '/api/internal/agent/v1/heartbeat',
    };

    prisma.vpsNode.findUnique.mockResolvedValue({
      secretKey,
      credentialsRevokedAt: null,
    });

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verifies against rawBody bytes, not JSON.stringify(parsedBody)', async () => {
    const now = new Date('2026-08-09T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    // On-wire JSON with different key order than Object insertion order after parse.
    const rawOnWire =
      '{"agentInstanceId":"machine-1","schemaVersion":"phase1","sentAt":"2026-08-09T12:00:00.000Z"}';
    const timestamp = now.toISOString();
    const signature = signRaw(secretKey, timestamp, rawOnWire);
    const request = {
      body, // re-serializing this would differ from rawOnWire key order
      rawBody: Buffer.from(rawOnWire, 'utf8'),
      headers: {
        'x-agent-timestamp': timestamp,
        'x-agent-signature': signature,
      },
      ip: '127.0.0.1',
      originalUrl: '/api/internal/agent/v1/heartbeat',
    };

    prisma.vpsNode.findUnique.mockResolvedValue({
      secretKey,
      credentialsRevokedAt: null,
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it('normalizes array header values', async () => {
    const now = new Date('2026-08-09T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const timestamp = now.toISOString();
    const signature = signRaw(secretKey, timestamp, rawBodyString);
    const request = {
      body,
      rawBody: Buffer.from(rawBodyString, 'utf8'),
      headers: {
        'x-agent-timestamp': [timestamp, 'ignored'],
        'x-agent-signature': [signature, 'ignored'],
      },
      ip: '127.0.0.1',
      originalUrl: '/api/internal/agent/v1/heartbeat',
    };

    prisma.vpsNode.findUnique.mockResolvedValue({
      secretKey,
      credentialsRevokedAt: null,
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });
});
