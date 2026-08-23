import { describe, expect, it } from 'vitest';

import { TicketServiceCategory } from '#/generated/prisma/enums.js';

import {
  isWebsiteRequiredForService,
  TICKET_SERVICE_CATALOG,
} from './ticket-service-catalog.js';

describe('ticket-service-catalog', () => {
  it('marks every service as website-optional', () => {
    for (const item of TICKET_SERVICE_CATALOG) {
      expect(item.websiteRequired).toBe(false);
      expect(isWebsiteRequiredForService(item.code)).toBe(false);
    }

    expect(
      isWebsiteRequiredForService(TicketServiceCategory.WOOCOMMERCE_SUPPORT),
    ).toBe(false);
    expect(
      isWebsiteRequiredForService(TicketServiceCategory.GRAPHIC_DESIGN),
    ).toBe(false);
  });
});
