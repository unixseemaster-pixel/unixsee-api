import { Module } from '@nestjs/common';
import { SslCertificatesService } from './services/ssl-certificates.service';

@Module({
  providers: [SslCertificatesService]
})
export class SslCertificatesModule {}
