import { SatisfactionFollowUpStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListSatisfactionQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() lowOnly?: boolean;
  @IsOptional() @IsEnum(SatisfactionFollowUpStatus) followUpStatus?: SatisfactionFollowUpStatus;
  @IsOptional() @IsString() requester?: string;
}
