import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsOptional()
  avatar: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsOptional()
  displayName: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsOptional()
  bio: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsOptional()
  backgroundImage: string | null;
}
