import { applyDecorators } from '@nestjs/common';
import { Matches, MaxLength, MinLength } from 'class-validator';

export const IsStrongPassword = () => applyDecorators(
  MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' }),
  MaxLength(72, { message: 'A senha deve ter no máximo 72 caracteres.' }),
  Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: 'A senha deve conter letras, números e um caractere especial.',
  }),
);
