import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const optionalText = () => Transform(({ value }) => typeof value === 'string' ? (value.trim() || null) : value);
const deadline = () => Transform(({ value }) => value === '' ? null : value);

export class UpdateSettingsDto {
  @IsOptional() @optionalText() @IsString() @MaxLength(120) environmentName?: string | null;
  @IsOptional() @optionalText() @IsString() @MaxLength(180) institutionName?: string | null;
  @IsOptional() @optionalText() @IsString() @MaxLength(240) environmentDescription?: string | null;
  @IsOptional() @optionalText() @IsString() @MaxLength(253)
  @Matches(/^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i, { message: 'allowedEmailDomain deve ser um domínio sem @, como colsan.org.br.' })
  allowedEmailDomain?: string | null;

  @IsOptional() @IsBoolean() requesterSelfRegistrationEnabled?: boolean;
  @IsOptional() @IsBoolean() internalNotificationsEnabled?: boolean;
  @IsOptional() @IsBoolean() operationalEmailsEnabled?: boolean;
  @IsOptional() @IsBoolean() deadlineAlertsEnabled?: boolean;

  @IsOptional() @deadline() @IsInt() @Min(1) @Max(3650) defaultServiceOrderDeadlineDays?: number | null;
  @IsOptional() @deadline() @IsInt() @Min(1) @Max(3650) defaultTaskDeadlineDays?: number | null;
  @IsOptional() @deadline() @IsInt() @Min(1) @Max(3650) defaultProjectDeadlineDays?: number | null;
}
