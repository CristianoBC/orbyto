import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateDailyLogDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(10000)
  content?: string;

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
