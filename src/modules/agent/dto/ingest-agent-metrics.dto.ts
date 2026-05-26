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
} from 'class-validator';

export class MetricPayloadDto {
  @IsNumber()
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
}

export class WebsitePayloadDto {
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
}

export class TelemetryBatchEntryDto {
  @IsString()
  @IsNotEmpty()
  machineId!: string;

  @IsISO8601()
  timestamp!: string;

  @ValidateNested()
  @Type(() => MetricPayloadDto)
  @IsNotEmpty()
  metrics!: MetricPayloadDto;

  @IsArray()
  @ValidateNested()
  @Type(() => WebsitePayloadDto)
  websites!: WebsitePayloadDto[];
}

export class IngestAgentMetricsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetryBatchEntryDto)
  @IsNotEmpty()
  batch!: TelemetryBatchEntryDto[];
}
