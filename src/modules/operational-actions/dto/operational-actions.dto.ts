import { IsEnum } from 'class-validator';

import { OperationalActionType } from '#/generated/prisma/enums.js';

export class CreateOperationalActionDto {
  @IsEnum(OperationalActionType)
  type!: OperationalActionType;
}
