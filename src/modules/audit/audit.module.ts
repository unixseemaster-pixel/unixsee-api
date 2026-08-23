import { Module } from '@nestjs/common';

import { AdminAuditController } from './controllers/admin-audit.controller.js';
import { AuditService } from './services/audit.service.js';

@Module({
  providers: [AuditService],
  controllers: [AdminAuditController],
  exports: [AuditService],
})
export class AuditModule {}
