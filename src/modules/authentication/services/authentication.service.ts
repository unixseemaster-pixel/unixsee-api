import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/modules/prisma/services/prisma.service';

@Injectable()
export class AuthenticationService {
  constructor(private readonly prisma: PrismaService) {}
}
