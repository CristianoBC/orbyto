import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { LookupsController } from './lookups.controller';
import { LookupsService } from './lookups.service';

@Module({ imports: [PermissionsModule], controllers: [LookupsController], providers: [LookupsService], exports: [LookupsService] })
export class LookupsModule {}
