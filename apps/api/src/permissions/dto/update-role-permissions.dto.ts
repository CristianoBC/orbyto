import { PermissionModule } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';

class PermissionEntryDto {
  @IsEnum(PermissionModule) module!: PermissionModule;
  @IsBoolean() canView!: boolean;
  @IsBoolean() canCreate!: boolean;
  @IsBoolean() canEdit!: boolean;
  @IsBoolean() canDelete!: boolean;
  @IsBoolean() canManage!: boolean;
}
export class UpdateRolePermissionsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => PermissionEntryDto)
  permissions!: PermissionEntryDto[];
}
