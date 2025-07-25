import { PaginationDto } from './pagination';
import { IsNotEmpty, IsIn } from 'class-validator';

export class ExploreDto extends PaginationDto {
  @IsIn(['media', 'post'], { message: 'Type must be either media or post' })
  @IsNotEmpty({ message: 'Type is required' })
  type: 'media' | 'post';
}
