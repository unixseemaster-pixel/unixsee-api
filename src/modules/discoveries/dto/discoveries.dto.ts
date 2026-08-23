import { IsOptional, IsUUID } from 'class-validator';

export class AssignDiscoveryDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  planId?: string;
}
