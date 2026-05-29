import { Module } from '@nestjs/common';

import { SslCertificatesService } from './services/ssl-certificates.service.js';

@Module({
  providers: [SslCertificatesService],
})
export class SslCertificatesModule {}
