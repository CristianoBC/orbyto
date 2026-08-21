import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DeadlineAlertsModule } from './deadline-alerts/deadline-alerts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { DailyLogsModule } from './daily-logs/daily-logs.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { MailModule } from './mail/mail.module';
import { SettingsModule } from './settings/settings.module';
import { LookupsModule } from './lookups/lookups.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SatisfactionModule } from './satisfaction/satisfaction.module';
import { NotificationPreferencesModule } from './notification-preferences/notification-preferences.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SettingsModule,
    LookupsModule,
    PermissionsModule,
    ProjectsModule,
    AuthModule,
    AttachmentsModule,
    CommentsModule,
    DailyLogsModule,
    UsersModule,
    ServiceOrdersModule,
    TasksModule,
    AuditLogsModule,
    NotificationsModule,
    ReportsModule,
    MailModule,
    DeadlineAlertsModule,
    DashboardModule,
    SatisfactionModule,
    NotificationPreferencesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
