import { RefType } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsEnum(RefType)
  refType: RefType;

  @IsString()
  @MinLength(1)
  refId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text: string;
}
