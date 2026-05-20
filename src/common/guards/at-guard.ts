import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

import type { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class AtGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // if (this.isPublic(context)) return true;

    const canActivate = (await super.canActivate(context)) as boolean;
    if (!canActivate) return false;

    // const request = context.switchToHttp().getRequest();
    // const user = await this.getUserFromRequest(request);
    // if (!user) return false;

    // request.originalUser = user;
    return true;
  }

  //   private isPublic(context: ExecutionContext): boolean {
  //     return this.reflector.getAllAndOverride('isPublic', [
  //       context.getHandler(),
  //       context.getClass(),
  //     ]);
  //   }
}
