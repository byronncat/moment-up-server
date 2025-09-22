import { IsOptional, IsString, ValidateIf, MaxLength } from 'class-validator';
import { MAX_NAME_LENGTH, MAX_BIO_LENGTH } from 'src/common/constants';

export class UpdateProfileDto {
  @ValidateIf((_, value) => value !== null)
  @IsString({ message: 'Avatar must be a string' })
  @IsOptional()
  avatar: string | null;

  @ValidateIf((_, value) => value !== null)
  @MaxLength(MAX_NAME_LENGTH, {
    message: `Display name must be less than ${MAX_NAME_LENGTH} characters`,
  })
  @IsString({ message: 'Display name must be a string' })
  @IsOptional()
  displayName: string | null;

  @ValidateIf((_, value) => value !== null)
  @MaxLength(MAX_BIO_LENGTH, { message: `Bio must be less than ${MAX_BIO_LENGTH} characters` })
  @IsString({ message: 'Bio must be a string' })
  @IsOptional()
  bio: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsString({ message: 'Background image must be a string' })
  @IsOptional()
  backgroundImage: string | null;
}
