import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContentPrivacy } from 'src/common/constants';

export class RepostDto {
  @MaxLength(500, { message: 'Comment cannot exceed 500 characters' })
  @IsString({ message: 'Comment must be a string' })
  @IsOptional()
  comment?: string;

  @Type(() => Number)
  @IsEnum(ContentPrivacy, { message: 'Content privacy must be a valid enum value' })
  @IsNotEmpty({ message: 'Content privacy is required' })
  audience: ContentPrivacy;
}
