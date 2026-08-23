import { Module } from '@nestjs/common';

import { SslCertificatesService } from './services/ssl-certificates.service.js';

@Module({
  providers: [SslCertificatesService],
  exports: [SslCertificatesService],
})
export class SslCertificatesModule {}
