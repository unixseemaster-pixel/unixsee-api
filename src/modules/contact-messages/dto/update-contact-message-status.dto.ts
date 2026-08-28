import { IsIn } from 'class-validator';

import { ContactMessageStatus } from '#/generated/prisma/enums.js';

export const CONTACT_MESSAGE_STATUS_VALUES = [
  ContactMessageStatus.NEW,
  ContactMessageStatus.READ,
  ContactMessageStatus.ARCHIVED,
] as const;

export class UpdateContactMessageStatusDto {
  @IsIn(CONTACT_MESSAGE_STATUS_VALUES)
  status!: (typeof CONTACT_MESSAGE_STATUS_VALUES)[number];
}
