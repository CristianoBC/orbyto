import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PermissionModule } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { ListSatisfactionQueryDto } from './dto/list-satisfaction-query.dto';
import { SubmitSatisfactionDto } from './dto/submit-satisfaction.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { SatisfactionService } from './satisfaction.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class SatisfactionController {
  constructor(private readonly satisfaction: SatisfactionService) {}

  @Get('satisfaction')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.SATISFACTION)
  list(@CurrentUser() user: AuthUser, @Query() query: ListSatisfactionQueryDto) { return this.satisfaction.list(user, query); }

  @Get('satisfaction/summary')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.SATISFACTION)
  summary(@CurrentUser() user: AuthUser, @Query() query: ListSatisfactionQueryDto) { return this.satisfaction.summary(user, query); }

  @Patch('satisfaction/:id/follow-up')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.SATISFACTION, 'edit')
  followUp(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFollowUpDto) { return this.satisfaction.followUp(user, id, dto); }

  @Get('service-orders/:id/satisfaction')
  getForOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.satisfaction.getForOrder(user, id); }

  @Post('service-orders/:id/satisfaction')
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitSatisfactionDto) { return this.satisfaction.submit(user, id, dto); }
}
