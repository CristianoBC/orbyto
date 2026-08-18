import { Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DeadlineAlertsService } from './deadline-alerts.service';

@Controller('alerts/deadlines')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class DeadlineAlertsController {
  constructor(private readonly alerts: DeadlineAlertsService) {}

  @Post('run')
  run(@CurrentUser() user: AuthUser) {
    return this.alerts.run(user);
  }
}
