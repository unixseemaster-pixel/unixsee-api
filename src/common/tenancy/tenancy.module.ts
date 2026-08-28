import { Global, Module } from '@nestjs/common';

import { AuditModule } from '#/modules/audit/audit.module.js';

import { CommercialAuthorizationService } from './commercial-authorization.service.js';
import { TenantAccessService } from './tenant-access.service.js';

@Global()
@Module({
  imports: [AuditModule],
  providers: [TenantAccessService, CommercialAuthorizationService],
  exports: [TenantAccessService, CommercialAuthorizationService],
})
export class TenancyModule {}
