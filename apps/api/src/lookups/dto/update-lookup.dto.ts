import { LookupRelatedModule } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class UpdateLookupDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(180) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsUUID() parentId?: string | null;
  @IsOptional() @ValidateIf((_, value) => value !== null) @IsEnum(LookupRelatedModule) relatedModule?: LookupRelatedModule | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateLookupStatusDto {
  @IsBoolean()
  isActive: boolean;
}
