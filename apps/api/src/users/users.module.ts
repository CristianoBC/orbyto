import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MailModule } from '../mail/mail.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [MailModule],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
})
export class UsersModule {}
