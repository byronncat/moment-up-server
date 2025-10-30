import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AttachmentDto } from 'src/common/validators';
import { ContentPrivacy } from 'src/common/constants';

export class CreatePostDto {
  @IsString({ message: 'Text must be a string' })
  @IsOptional()
  text?: string;

  @Type(() => AttachmentDto)
  @ValidateNested({ each: true })
  @IsArray({ message: 'Attachments must be an array' })
  @IsOptional()
  attachments?: AttachmentDto[];

  @Type(() => Number)
  @IsEnum(ContentPrivacy, { message: 'Content privacy must be a valid enum value' })
  @IsOptional()
  privacy: ContentPrivacy = ContentPrivacy.PUBLIC;
}
