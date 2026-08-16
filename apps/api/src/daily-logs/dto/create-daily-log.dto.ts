import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDailyLogDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title: string;

  @IsString()
  @MinLength(3)
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  type?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  logDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(24)
  workedHours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  blockers?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  nextSteps?: string;
}
