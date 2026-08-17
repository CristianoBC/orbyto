import { Type } from 'class-transformer';
import { Priority, ServiceOrderStatus } from '@prisma/client';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class UpdateServiceOrderDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  system?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  status?: ServiceOrderStatus;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date | null;

  @IsOptional()
  @IsString()
  observation?: string;
}
