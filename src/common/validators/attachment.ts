import { IsIn, IsString } from 'class-validator';

export class AttachmentDto {
  @IsString({ message: 'Attachment ID must be a string' })
  id: string;

  @IsString({ message: 'Attachment type must be a string' })
  @IsIn(['image', 'video'], { message: 'Attachment type must be either "image" or "video"' })
  type: 'image' | 'video';
}
