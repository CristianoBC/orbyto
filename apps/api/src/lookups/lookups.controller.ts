import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LookupType, PermissionModule, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { CreateLookupDto } from './dto/create-lookup.dto';
import { ListLookupsQueryDto } from './dto/list-lookups-query.dto';
import { UpdateLookupDto, UpdateLookupStatusDto } from './dto/update-lookup.dto';
import { LookupsService } from './lookups.service';

@Controller('lookups')
@UseGuards(JwtAuthGuard)
export class LookupsController {
  constructor(private readonly lookups: LookupsService) {}

  @Get('options/service-order')
  serviceOrderOptions(@CurrentUser() user: AuthUser) { return this.lookups.serviceOrderOptions(user.tenantId); }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.LOOKUPS)
  list(@CurrentUser() user: AuthUser, @Query() query: ListLookupsQueryDto) { return this.lookups.list(user.tenantId, query); }

  @Get(':type')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.LOOKUPS)
  listType(@CurrentUser() user: AuthUser, @Param('type', new ParseEnumPipe(LookupType)) type: LookupType, @Query('isActive') isActive?: string) {
    return this.lookups.listType(user.tenantId, type, isActive === 'true');
  }

  @Post()
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.VIEWER)
  @RequirePermission(PermissionModule.LOOKUPS, 'manage')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLookupDto) { return this.lookups.create(user, dto); }

  @Patch(':id')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.VIEWER)
  @RequirePermission(PermissionModule.LOOKUPS, 'manage')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateLookupDto) { return this.lookups.update(user, id, dto); }

  @Patch(':id/status')
  @UseGuards(RolesGuard, PermissionsGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.VIEWER)
  @RequirePermission(PermissionModule.LOOKUPS, 'manage')
  status(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateLookupStatusDto) { return this.lookups.setStatus(user, id, dto.isActive); }
}
