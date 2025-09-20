import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ContentPrivacy } from 'src/common/constants';

class AttachmentDto {
  @IsString({ message: 'Attachment ID must be a string' })
  id: string;

  @IsString({ message: 'Attachment type must be a string' })
  @IsIn(['image', 'video'], { message: 'Attachment type must be either "image" or "video"' })
  type: 'image' | 'video';
}

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
