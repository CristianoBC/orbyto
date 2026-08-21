import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional() @IsBoolean() internalNotificationsEnabled?: boolean;
  @IsOptional() @IsBoolean() emailNotificationsEnabled?: boolean;
  @IsOptional() @IsBoolean() serviceOrderUpdatesEmail?: boolean;
  @IsOptional() @IsBoolean() serviceOrderCommentsEmail?: boolean;
  @IsOptional() @IsBoolean() serviceOrderAttachmentsEmail?: boolean;
  @IsOptional() @IsBoolean() projectUpdatesEmail?: boolean;
  @IsOptional() @IsBoolean() projectCommentsEmail?: boolean;
  @IsOptional() @IsBoolean() taskUpdatesEmail?: boolean;
  @IsOptional() @IsBoolean() taskCommentsEmail?: boolean;
  @IsOptional() @IsBoolean() deadlineAlertsEmail?: boolean;
  @IsOptional() @IsBoolean() satisfactionAlertsEmail?: boolean;
  @IsOptional() @IsBoolean() dailySummaryEmail?: boolean;
}
