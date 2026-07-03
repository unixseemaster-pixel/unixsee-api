import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { RequestContext } from '#/common/logging/request-context.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class AtGuard extends AuthGuard('jwt') {
  private readonly logger = createAppLogger(AtGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) return true;

    const canActivate = (await super.canActivate(context)) as boolean;

    if (!canActivate) {
      this.logger.warn('auth.access_guard.rejected');
      return false;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      this.logger.warn('auth.access_guard.user_missing');
      return false;
    }

    if (typeof user.sub === 'string') {
      RequestContext.setUserId(user.sub);
    }

    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}
