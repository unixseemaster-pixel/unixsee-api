import { Injectable } from '@nestjs/common';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class TicketNumberService {
  constructor(private readonly prisma: PrismaService) {}

  async allocate(): Promise<string> {
    const rows = await this.prisma.$queryRaw<Array<{ nextval: bigint | number }>>`
      SELECT nextval('ticket_number_seq') AS nextval
    `;
    const raw = rows[0]?.nextval;
    const value = typeof raw === 'bigint' ? Number(raw) : Number(raw ?? 0);
    return `TCK-${value}`;
  }
}
