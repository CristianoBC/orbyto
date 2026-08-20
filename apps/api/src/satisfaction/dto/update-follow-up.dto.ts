import { SatisfactionFollowUpStatus } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateFollowUpDto {
  @IsEnum(SatisfactionFollowUpStatus)
  followUpStatus!: SatisfactionFollowUpStatus;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  followUpNotes!: string;
}
