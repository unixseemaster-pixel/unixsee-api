import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { createAppLogger } from '#/common/logging/app-logger.js';
import type { Role } from '#/generated/prisma/enums.js';
import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = createAppLogger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request.user?.role as Role | undefined;

    if (!userRole || !requiredRoles.includes(userRole)) {
      this.logger.warn('auth.roles.rejected', {
        requiredRoles,
        userRole: userRole ?? null,
        userId: request.user?.id ?? request.user?.sub ?? null,
      });
      throw new ForbiddenException(ERROR_MESSAGES.fa.forbidden);
    }

    return true;
  }
}
