import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class EnrollAgentDto {
  @IsString()
  @MinLength(1)
  agentInstanceId!: string;

  @IsOptional()
  @IsString()
  agentVersion?: string;
}

export class FieldStatusDto {
  @IsString()
  @IsIn(['ok', 'unknown', 'unsupported'])
  state!: 'ok' | 'unknown' | 'unsupported';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class HeartbeatAgentDto {
  @IsString()
  @Equals('phase1')
  schemaVersion!: 'phase1';

  @IsString()
  @MinLength(1)
  agentInstanceId!: string;

  @IsOptional()
  @IsString()
  agentVersion?: string;

  @IsISO8601()
  sentAt!: string;
}

export class Phase1DiscoveryDto {
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  aliases!: string[];

  @IsString()
  @IsNotEmpty()
  virtualHostName!: string;

  @IsString()
  @Equals('openlitespeed')
  source!: 'openlitespeed';

  @IsISO8601()
  discoveredAt!: string;
}

export class SiteStackSnapshotDto {
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsOptional()
  @IsString()
  wordpressVersion?: string | null;

  @IsOptional()
  @IsString()
  phpVersion?: string | null;

  @IsOptional()
  @IsString()
  imagickVersion?: string | null;

  @IsISO8601()
  checkedAt!: string;

  @IsObject()
  fieldStatus!: Record<string, FieldStatusDto>;
}

export class ActiveVisitors3mDto {
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  uniqueVisitorCount?: number | null;

  @IsInt()
  @Min(1)
  windowSeconds!: number;

  @IsISO8601()
  windowStartedAt!: string;

  @IsISO8601()
  measuredAt!: string;

  @ValidateNested()
  @Type(() => FieldStatusDto)
  status!: FieldStatusDto;
}

export class Visitors24hDto {
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  uniqueVisitors24h?: number | null;

  @IsInt()
  @Min(1)
  windowSeconds!: number;

  @IsInt()
  @Min(0)
  coverageSeconds!: number;

  @IsISO8601()
  measuredAt!: string;

  @IsString()
  @Equals('hll')
  algorithm!: 'hll';

  @ValidateNested()
  @Type(() => FieldStatusDto)
  status!: FieldStatusDto;
}

export class Phase1IngestDto {
  @IsString()
  @Equals('phase1')
  schemaVersion!: 'phase1';

  @IsString()
  @MinLength(1)
  agentInstanceId!: string;

  @IsOptional()
  @IsString()
  agentVersion?: string;

  @IsISO8601()
  sentAt!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => Phase1DiscoveryDto)
  discoveries?: Phase1DiscoveryDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SiteStackSnapshotDto)
  siteStacks?: SiteStackSnapshotDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ActiveVisitors3mDto)
  activeVisitors3m?: ActiveVisitors3mDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => Visitors24hDto)
  visitors24h?: Visitors24hDto[];
}

export class AgentCommandResultDto {
  @IsString()
  @MinLength(1)
  agentInstanceId!: string;

  @IsString()
  @IsIn(['SUCCEEDED', 'FAILED'])
  status!: 'SUCCEEDED' | 'FAILED';

  @IsISO8601()
  finishedAt!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteStackSnapshotDto)
  stackSnapshot?: SiteStackSnapshotDto;

  @IsOptional()
  @IsString()
  errorCode?: string;
}
