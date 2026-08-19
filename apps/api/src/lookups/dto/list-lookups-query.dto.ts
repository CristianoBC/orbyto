import { LookupType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListLookupsQueryDto {
  @IsOptional() @IsEnum(LookupType) type?: LookupType;
  @IsOptional() @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MaxLength(180) search?: string;
}
