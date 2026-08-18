import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PermissionModule, UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.usersService.findMe(user.id, user.tenantId);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateOwnProfileDto) {
    return this.usersService.updateMe(user, dto);
  }

  @Get()
  @UseGuards(RolesGuard, PermissionsGuard)
  @RequirePermission(PermissionModule.USERS)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  findAll(@CurrentUser() user: AuthUser) {
    return this.usersService.findAllByTenant(user.tenantId);
  }

  @Get(':id')
  @UseGuards(RolesGuard, PermissionsGuard)
  @RequirePermission(PermissionModule.USERS)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.findOne(user, id);
  }

  @Post()
  @UseGuards(RolesGuard, PermissionsGuard)
  @RequirePermission(PermissionModule.USERS, 'create')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user, dto);
  }

  @Post('invite')
  @UseGuards(RolesGuard, PermissionsGuard)
  @RequirePermission(PermissionModule.USERS, 'create')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  invite(@CurrentUser() user: AuthUser, @Body() dto: InviteUserDto) {
    return this.usersService.invite(user, dto);
  }

  @Post(':id/resend-invite')
  @UseGuards(RolesGuard, PermissionsGuard)
  @RequirePermission(PermissionModule.USERS, 'create')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  resendInvite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.resendInvite(user, id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard, PermissionsGuard)
  @RequirePermission(PermissionModule.USERS, 'edit')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user, id, dto);
  }

  @Patch(':id/reset-password')
  @UseGuards(RolesGuard, PermissionsGuard)
  @RequirePermission(PermissionModule.USERS, 'manage')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  resetPassword(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ResetUserPasswordDto) {
    return this.usersService.resetPassword(user, id, dto);
  }
}
