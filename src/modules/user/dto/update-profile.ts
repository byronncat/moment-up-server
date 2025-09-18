import { IsOptional, IsString, ValidateIf, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ValidateIf((_, value) => value !== null)
  @IsString({ message: 'Avatar must be a string' })
  @IsOptional()
  avatar: string | null;

  @ValidateIf((_, value) => value !== null)
  @MaxLength(50, { message: 'Display name must be less than 30 characters' })
  @IsString({ message: 'Display name must be a string' })
  @IsOptional()
  displayName: string | null;

  @ValidateIf((_, value) => value !== null)
  @MaxLength(160, { message: 'Bio must be less than 100 characters' })
  @IsString({ message: 'Bio must be a string' })
  @IsOptional()
  bio: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString({ message: 'Background image must be a string' })
  @IsOptional()
  backgroundImage: string | null;
}
