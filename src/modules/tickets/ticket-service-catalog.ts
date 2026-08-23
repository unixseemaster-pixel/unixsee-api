import { TicketServiceCategory } from '#/generated/prisma/enums.js';

export type TicketServiceCatalogItem = {
  code: TicketServiceCategory;
  /** Always false in Phase 1 — website may be associated when present. */
  websiteRequired: boolean;
};

export const TICKET_SERVICE_CATALOG: readonly TicketServiceCatalogItem[] = [
  { code: TicketServiceCategory.MANAGED_SERVER, websiteRequired: false },
  {
    code: TicketServiceCategory.MIGRATION_OPTIMIZATION,
    websiteRequired: false,
  },
  { code: TicketServiceCategory.WOOCOMMERCE_SUPPORT, websiteRequired: false },
  { code: TicketServiceCategory.SEO, websiteRequired: false },
  { code: TicketServiceCategory.GRAPHIC_DESIGN, websiteRequired: false },
  { code: TicketServiceCategory.PRODUCT_DATA_ENTRY, websiteRequired: false },
  {
    code: TicketServiceCategory.SOCIAL_MEDIA_SUPPORT,
    websiteRequired: false,
  },
] as const;

export function isWebsiteRequiredForService(
  service: TicketServiceCategory,
): boolean {
  const item = TICKET_SERVICE_CATALOG.find((entry) => entry.code === service);
  return item?.websiteRequired ?? false;
}
