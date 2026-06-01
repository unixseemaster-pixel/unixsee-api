import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { ERROR_MESSAGES } from '#/utils/error-messages.js';

@Injectable()
export class MonitoringAccessGuard extends AuthGuard('jwt-monitoring-access') {
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
      throw new UnauthorizedException(ERROR_MESSAGES.fa.unauthenticated);
    }

    return user;
  }
}
