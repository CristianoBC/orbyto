import { AuditAction } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) => value === '' ? undefined : value;

export class ListAuditLogsQueryDto {
  @IsOptional() @Transform(emptyToUndefined) @IsString() entity?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() resource?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() module?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() entityId?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsEnum(AuditAction) action?: AuditAction;
  @IsOptional() @Transform(emptyToUndefined) @IsEnum(AuditAction) eventType?: AuditAction;
  @IsOptional() @Transform(emptyToUndefined) @IsString() userId?: string;
  @IsOptional() @Transform(emptyToUndefined) @IsString() search?: string;
  @IsOptional() @Transform(({ value }) => value ? new Date(value as string) : undefined) @IsDate() dateFrom?: Date;
  @IsOptional() @Transform(({ value }) => value ? new Date(value as string) : undefined) @IsDate() dateTo?: Date;
  @IsOptional() @Transform(({ value }) => value ? new Date(value as string) : undefined) @IsDate() startDate?: Date;
  @IsOptional() @Transform(({ value }) => value ? new Date(value as string) : undefined) @IsDate() endDate?: Date;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() criticalOnly = false;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
}
