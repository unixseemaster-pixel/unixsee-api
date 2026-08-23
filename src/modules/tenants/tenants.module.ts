import { Global, Module } from '@nestjs/common';

import { TenantsService } from './services/tenants.service.js';
import { TenantsController } from './controllers/tenants.controller.js';
import { AdminTenantsController } from './controllers/admin-tenants.controller.js';

@Global()
@Module({
  providers: [TenantsService],
  controllers: [TenantsController, AdminTenantsController],
  exports: [TenantsService],
})
export class TenantsModule {}
