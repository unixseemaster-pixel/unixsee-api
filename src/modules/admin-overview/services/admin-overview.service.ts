import { Injectable } from '@nestjs/common';

import { createAppLogger } from '#/common/logging/app-logger.js';
import {
  ComplementaryRequestStatus,
  PlanRequestStatus,
  TicketStatus,
} from '#/generated/prisma/enums.js';
import { PrismaService } from '#/modules/prisma/services/prisma.service.js';

@Injectable()
export class AdminOverviewService {
  private readonly logger = createAppLogger(AdminOverviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [openTickets, submittedPlanRequests, complementaryNeedingReview] =
      await this.prisma.$transaction([
        this.prisma.ticket.count({
          where: {
            status: {
              in: [
                TicketStatus.SUBMITTED,
                TicketStatus.IN_PROGRESS,
                TicketStatus.WAITING_CUSTOMER,
              ],
            },
          },
        }),
        this.prisma.planRequest.count({
          where: { status: PlanRequestStatus.SUBMITTED },
        }),
        this.prisma.complementaryServiceRequest.count({
          where: {
            status: {
              in: [
                ComplementaryRequestStatus.SUBMITTED,
                ComplementaryRequestStatus.QUOTED,
              ],
            },
          },
        }),
      ]);

    this.logger.debug('admin.overview.loaded', {
      openTickets,
      submittedPlanRequests,
      complementaryNeedingReview,
    });

    return {
      openTickets,
      submittedPlanRequests,
      complementaryNeedingReview,
    };
  }
}
