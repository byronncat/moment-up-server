import { PaginationDto } from './pagination';
import { IsOptional, IsIn } from 'class-validator';

export class ProfileMomentDto extends PaginationDto {
  @IsIn(['media', 'tagged', 'reposts', 'liked'], {
    message: 'Filter must be either media, tagged, reposts, or likes',
  })
  @IsOptional()
  filter?: 'media' | 'tagged' | 'reposts' | 'liked';
}
