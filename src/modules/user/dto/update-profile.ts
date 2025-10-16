import { IsOptional, MaxLength, ValidateIf } from 'class-validator';
import { MAX_BIO_LENGTH, MAX_NAME_LENGTH } from 'src/common/constants';

export class UpdateProfileDto {
  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  avatar?: string | null;

  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  backgroundImage?: string | null;

  @ValidateIf((_, value) => value !== null)
  @MaxLength(MAX_NAME_LENGTH, {
    message: `Display name must be less than ${MAX_NAME_LENGTH} characters.`,
  })
  @IsOptional()
  displayName?: string | null;

  @ValidateIf((_, value) => value !== null)
  @MaxLength(MAX_BIO_LENGTH, { message: `Bio must be less than ${MAX_BIO_LENGTH} characters.` })
  @IsOptional()
  bio?: string | null;
}
