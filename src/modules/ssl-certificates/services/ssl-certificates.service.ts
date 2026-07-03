import { SSLCertificate } from '#/generated/prisma/client.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';
import { Injectable } from '@nestjs/common';
import { createAppLogger } from '#/common/logging/app-logger.js';

@Injectable()
export class SslCertificatesService {
  private readonly logger = createAppLogger(SslCertificatesService.name);

  constructor(private prisma: PrismaService) {}

  async getExpiringCertificates(userId: string, daysThreshold = 14) {
    const now = new Date();

    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);

    const certificates = await this.prisma.sSLCertificate.findMany({
      where: {
        website: {
          userId,
        },
        validTo: {
          not: null,
          lte: thresholdDate,
        },
      },
      include: {
        website: {
          select: {
            id: true,
            domain: true,
          },
        },
      },
      orderBy: {
        validTo: 'asc',
      },
    });

    this.logger.debug('ssl.expiring_certificates.loaded', {
      userId,
      daysThreshold,
      count: certificates.length,
    });

    return certificates.map((certificate) => ({
      id: certificate.id,
      websiteId: certificate.websiteId,
      domain: certificate.website.domain,

      issuer: certificate.issuer,
      subject: certificate.subject,

      validFrom: certificate.validFrom,
      validTo: certificate.validTo,

      serialNumber: certificate.serialNumber,
      isAutoRenewable: certificate.isAutoRenewable,
      statusMessage: certificate.statusMessage,
      daysRemaining: this.calculateDaysRemaining(certificate),
      isValid: certificate.isValid,
    }));
  }

  private calculateDaysRemaining(certificate: SSLCertificate) {
    if (!certificate.validTo) return null;

    return Math.ceil(
      (new Date(certificate?.validTo).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
  }
}
