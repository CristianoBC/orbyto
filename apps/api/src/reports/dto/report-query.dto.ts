import {
  DailyLogStatus,
  Priority,
  ProjectStatus,
  ServiceOrderStatus,
  TaskStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 100;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  overdue?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  late?: boolean;
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
  @IsOptional() @IsString() @MaxLength(180) projectType?: string;
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
