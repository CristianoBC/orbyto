import { Global, Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsController } from './permissions.controller';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';
@Global() @Module({ controllers: [PermissionsController], providers: [PermissionsService, PermissionsGuard, RolesGuard], exports: [PermissionsService, PermissionsGuard] })
export class PermissionsModule {}
