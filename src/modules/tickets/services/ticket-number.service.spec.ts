import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

import { TicketNumberService } from './ticket-number.service.js';

describe('TicketNumberService.allocate', () => {
  let service: TicketNumberService;

  const prisma = {
    $queryRaw: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketNumberService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TicketNumberService);
  });

  it('returns TCK-{sequence} from prisma query', async () => {
    prisma.$queryRaw.mockResolvedValue([{ nextval: 1052n }]);

    await expect(service.allocate()).resolves.toBe('TCK-1052');
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });
});
