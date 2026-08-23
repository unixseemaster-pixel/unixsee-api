/**
 * Archived monitoring-agent batch ingest shapes (ADR 0008 / 0009).
 * Not used by the live Phase 1 `agent` plane. Resume under
 * `/api/internal/monitoring-agent/v1` when monitoring work returns.
 */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsISO8601,
  IsNumber,
  ValidateNested,
  IsInt,
  Min,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

export class MonitoringMetricPayloadDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  cpuMean!: number;

  @IsInt()
  @Min(0)
  ramMeanMB!: number;

  @IsInt()
  @Min(0)
  ramTotalMB!: number;

  @IsInt()
  @Min(0)
  lsConnectionsPeak!: number;

  @IsInt()
  @Min(0)
  diskReadBytesPerSecondMean!: number;

  @IsInt()
  @Min(0)
  diskWriteBytesPerSecondMean!: number;

  @IsInt()
  @Min(0)
  diskIopsMean!: number;

  @IsInt()
  @Min(0)
  storageTotalMB!: number;

  @IsInt()
  @Min(0)
  storageAvailableMB!: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  networkRxBytesPerSecondMean?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  networkTxBytesPerSecondMean?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cpuCoreCount?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  load1?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  load5?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  load15?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ramAvailableMB?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  swapTotalMB?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  swapUsedMB?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  processCount?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  uptimeSeconds?: number;
}

export class MonitoringWebsitePayloadDto {
  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsString()
  @IsNotEmpty()
  documentRoot!: string;

  @IsString()
  @IsNotEmpty()
  owner!: string;

  @IsInt()
  @Min(0)
  peakConcurrentRequests!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  requestRate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  activeConnections?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  processingRequests?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  bytesInPerSecond?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  bytesOutPerSecond?: number;

  // Old agents may still send `probe`, but public uptime/response probes
  // are owned by the backend uptime module.
  @IsOptional()
  probe?: unknown;

  @IsOptional()
  @IsString()
  appType?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsString()
  backendAddress?: string;

  @IsOptional()
  @IsString()
  virtualHostName?: string;
}

export class MonitoringTelemetryBatchEntryDto {
  @IsString()
  @IsNotEmpty()
  machineId!: string;

  @IsISO8601()
  timestamp!: string;

  @ValidateNested()
  @Type(() => MonitoringMetricPayloadDto)
  @IsNotEmpty()
  metrics!: MonitoringMetricPayloadDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MonitoringWebsitePayloadDto)
  websites!: MonitoringWebsitePayloadDto[];
}

export class MonitoringIngestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MonitoringTelemetryBatchEntryDto)
  @IsNotEmpty()
  batch!: MonitoringTelemetryBatchEntryDto[];
}
