import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from './password-validation';

export class RegisterRequesterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;
}
