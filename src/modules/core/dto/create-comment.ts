import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString({ message: 'Text must be a string' })
  @IsNotEmpty({ message: 'Text is required' })
  text: string;

  @IsString({ message: 'Post ID must be a string' })
  @IsNotEmpty({ message: 'Post ID is required' })
  postId: string;
}
