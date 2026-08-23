import { Global, Module } from '@nestjs/common';

import { TenantAccessService } from './tenant-access.service.js';

@Global()
@Module({
  providers: [TenantAccessService],
  exports: [TenantAccessService],
})
export class TenancyModule {}
