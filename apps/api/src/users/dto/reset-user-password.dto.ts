import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, { message: 'A senha temporária deve conter letras, números e um caractere especial.' })
  temporaryPassword: string;
}
