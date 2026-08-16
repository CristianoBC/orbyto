import { Priority, ProjectStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ListProjectsQueryDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  text?: string;
}
