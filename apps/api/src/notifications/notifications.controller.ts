import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() findAll(@CurrentUser() user: AuthUser, @Query() query: ListNotificationsQueryDto) { return this.notifications.findAll(user, query); }
  @Get('unread-count') unreadCount(@CurrentUser() user: AuthUser) { return this.notifications.unreadCount(user); }
  @Patch('read-all') markAllRead(@CurrentUser() user: AuthUser) { return this.notifications.markAllRead(user); }
  @Patch(':id/read') markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.notifications.markRead(user, id); }
}
