import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name: string;

  @IsEmail()
  @MaxLength(320)
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;
}
