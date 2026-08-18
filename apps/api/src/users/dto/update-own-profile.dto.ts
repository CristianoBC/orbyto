import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateOwnProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  avatarUrl?: string | null;
}
