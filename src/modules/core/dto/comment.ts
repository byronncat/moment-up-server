import { IsNotEmpty, IsString } from 'class-validator';

export class CommentDto {
  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  content: string;

  @IsString({ message: 'Moment ID must be a string' })
  @IsNotEmpty({ message: 'Moment ID is required' })
  momentId: string;
}
