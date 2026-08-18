import { Controller, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  constructor(
    private readonly alerts: DeadlineAlertsService,
    private readonly config: ConfigService,
  ) {}

  @Post('run')
  run(@CurrentUser() user: AuthUser) {
    if (this.config.get<string>('NODE_ENV') !== 'development')
      throw new NotFoundException();
    return this.alerts.run(user);
  }
}
