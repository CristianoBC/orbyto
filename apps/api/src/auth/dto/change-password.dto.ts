import { IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from './password-validation';

export class ChangePasswordDto {
  @IsString()
  @MaxLength(72)
  currentPassword!: string;

  @IsString()
  @IsStrongPassword()
  newPassword!: string;
}
