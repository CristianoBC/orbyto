import {
  DailyLogStatus,
  Priority,
  ProjectStatus,
  ServiceOrderStatus,
  TaskStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

class PeriodQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;
}

export class ServiceOrderReportQueryDto extends PeriodQueryDto {
  @IsOptional() @IsEnum(ServiceOrderStatus) status?: ServiceOrderStatus;
  @IsOptional() @IsEnum(Priority) priority?: Priority;
  @IsOptional() @IsUUID() requesterId?: string;
  @IsOptional() @IsUUID() responsibleId?: string;
  @IsOptional() @IsString() @MaxLength(180) unit?: string;
  @IsOptional() @IsString() @MaxLength(180) category?: string;
  @IsOptional() @IsString() @MaxLength(180) system?: string;
}

export class ProjectReportQueryDto extends PeriodQueryDto {
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsEnum(Priority) priority?: Priority;
  @IsOptional() @IsUUID() responsibleId?: string;
  @IsOptional() @IsString() @MaxLength(180) unit?: string;
}

export class TaskReportQueryDto extends PeriodQueryDto {
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsEnum(Priority) priority?: Priority;
  @IsOptional() @IsUUID() assigneeId?: string;
  @IsOptional() @IsUUID() projectId?: string;
}

export class DailyLogReportQueryDto extends PeriodQueryDto {
  @IsOptional() @IsEnum(DailyLogStatus) status?: DailyLogStatus;
  @IsOptional() @IsUUID() responsibleId?: string;
  @IsOptional() @IsUUID() projectId?: string;
}
