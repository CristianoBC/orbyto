import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionModule } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { ListServiceOrdersQueryDto } from './dto/list-service-orders-query.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ServiceOrdersService } from './service-orders.service';

@Controller('service-orders')
@UseGuards(JwtAuthGuard)
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.SERVICE_ORDERS, 'create')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceOrderDto) {
    return this.serviceOrdersService.create(user, dto);
  }

  @Get('my')
  findMy(
    @CurrentUser() user: AuthUser,
    @Query() query: ListServiceOrdersQueryDto,
  ) {
    return this.serviceOrdersService.findMy(user, query);
  }

  @Get('my/:id')
  findMyOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.serviceOrdersService.findMyOne(user, id);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.SERVICE_ORDERS)
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListServiceOrdersQueryDto,
  ) {
    return this.serviceOrdersService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.SERVICE_ORDERS)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.serviceOrdersService.findOne(user, id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.SERVICE_ORDERS, 'edit')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.update(user, id, dto);
  }
}
