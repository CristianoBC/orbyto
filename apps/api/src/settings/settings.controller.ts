import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { PermissionModule, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@RequirePermission(PermissionModule.SETTINGS, 'view')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}
  @Get() get(@CurrentUser() user: AuthUser) { return this.settings.getOrCreateSettingsForTenant(user.tenantId); }
  @Patch() update(@CurrentUser() user: AuthUser, @Body() dto: UpdateSettingsDto) { return this.settings.updateSettings(user, dto); }
}
