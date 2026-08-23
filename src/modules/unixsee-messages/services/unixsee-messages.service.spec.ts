import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BadRequestException, NotFoundException } from '@nestjs/common';

import {
  MembershipRole,
  UnixseeMessageStatus,
} from '#/generated/prisma/enums.js';

import { UnixseeMessagesService } from './unixsee-messages.service.js';

describe('UnixseeMessagesService', () => {
  const prisma = {
    membership: { findFirst: vi.fn() },
    tenant: { findUnique: vi.fn() },
    website: { findFirst: vi.fn() },
    unixseeMessage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    unixseeMessageRead: { upsert: vi.fn() },
    unixseeMessageAttachment: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };

  const tenantAccess = {
    getAccessibleTenantIds: vi.fn(),
    requireMembership: vi.fn(),
  };

  const storage = {
    upload: vi.fn(),
    createSignedUrl: vi.fn(),
    remove: vi.fn(),
  };

  let service: UnixseeMessagesService;

  beforeEach(() => {
    vi.clearAllMocks();
    storage.createSignedUrl.mockResolvedValue({
      signedUrl: 'https://signed.example/file',
    });
    service = new UnixseeMessagesService(
      prisma as never,
      tenantAccess as never,
      storage as never,
    );
  });

  it('resolves recipient preferred locale from tenant owner', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      user: { locale: 'en' },
    });

    await expect(
      service.resolveRecipientPreferredLocale('tenant-1'),
    ).resolves.toEqual({
      recipientPreferredLocale: 'en',
      recipientPreferredLocaleLabel: 'English',
    });

    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', role: MembershipRole.OWNER },
      }),
    );
  });

  it('defaults preferred locale to fa when missing', async () => {
    prisma.membership.findFirst.mockResolvedValue(null);
    await expect(
      service.resolveRecipientPreferredLocale('tenant-1'),
    ).resolves.toMatchObject({ recipientPreferredLocale: 'fa' });
  });

  it('rejects publish for withdrawn messages', async () => {
    prisma.unixseeMessage.findUnique.mockResolvedValue({
      id: 'm1',
      status: UnixseeMessageStatus.WITHDRAWN,
      title: 't',
      body: 'b',
      contentLocale: 'fa',
      tenantId: 't1',
      attachments: [],
      website: null,
      tenant: { id: 't1', name: 'T', displayName: null },
      links: null,
      publishedAt: null,
      withdrawnAt: new Date(),
      authorId: 'a1',
      websiteId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.publish('m1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('markRead requires membership and upserts read', async () => {
    prisma.unixseeMessage.findFirst.mockResolvedValue({
      id: 'm1',
      tenantId: 't1',
      status: UnixseeMessageStatus.PUBLISHED,
    });
    tenantAccess.requireMembership.mockResolvedValue(undefined);
    prisma.unixseeMessageRead.upsert.mockResolvedValue({
      id: 'r1',
      messageId: 'm1',
      userId: 'u1',
    });

    await expect(service.markRead('u1', 'm1')).resolves.toMatchObject({
      messageId: 'm1',
    });
    expect(tenantAccess.requireMembership).toHaveBeenCalledWith('u1', 't1');
  });

  it('getForUser throws when message missing', async () => {
    prisma.unixseeMessage.findFirst.mockResolvedValue(null);
    await expect(service.getForUser('u1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
