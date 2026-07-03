import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { ERROR_MESSAGES } from '#/utils/error-messages.js';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class MonitoringAccessGuard extends AuthGuard('jwt-monitoring-access') {
  private readonly logger = createAppLogger(MonitoringAccessGuard.name);
  getAuthenticateOptions(context: ExecutionContext) {
    return {
      property: 'monitoringAccess',
    };
  }

  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    if (err || !user) {
      this.logger.warn('auth.monitoring_access_guard.rejected', {
        errorName: err?.name,
        infoName: info?.name,
        status,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    return user;
  }
}
