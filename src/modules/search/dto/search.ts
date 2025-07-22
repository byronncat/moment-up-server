import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SearchDto {
  @IsString({ message: 'Query must be a string' })
  @IsNotEmpty({ message: 'Query is required' })
  query: string;

  @IsIn(['user', 'post', 'hashtag'], { message: 'Type must be one of: user, post, hashtag' })
  @IsString({ message: 'Type must be a string' })
  @IsOptional()
  type?: string;

  @Type(() => Number)
  @Min(1, { message: 'Page must be greater than 0' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Page must be a number' })
  @IsOptional()
  page: number = 1;

  @Type(() => Number)
  @Min(1, { message: 'Limit must be greater than 0' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Limit must be a number' })
  @IsOptional()
  limit: number = 12;
}
