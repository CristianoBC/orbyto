import { IsString, MaxLength } from 'class-validator';
import { IsStrongPassword } from './password-validation';

export class ResetPasswordDto {
  @IsString()
  @MaxLength(256)
  token!: string;

  @IsString()
  @IsStrongPassword()
  newPassword!: string;
}
