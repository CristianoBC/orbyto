import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class SubmitSatisfactionDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  comment?: string;

  @ValidateIf((item: SubmitSatisfactionDto) => item.rating <= 3)
  @IsString()
  @MaxLength(3000)
  lowRatingReason?: string;
}
