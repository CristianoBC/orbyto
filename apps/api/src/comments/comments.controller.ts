import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PermissionModule } from '@prisma/client';
import { RequirePermission } from '../permissions/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(user, dto);
  }

  @Get('service-order/:serviceOrderId')
  @UseGuards(PermissionsGuard)
  @RequirePermission(PermissionModule.SERVICE_ORDERS, 'view')
  findByServiceOrder(
    @CurrentUser() user: AuthUser,
    @Param('serviceOrderId') serviceOrderId: string,
  ) {
    return this.commentsService.findByServiceOrder(user, serviceOrderId);
  }
}
