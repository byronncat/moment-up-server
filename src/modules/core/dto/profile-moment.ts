import { IsOptional, IsIn } from 'class-validator';
import { PaginationDto } from 'src/common/validators';

export class ProfileMomentDto extends PaginationDto {
  @IsIn(['media', 'tagged', 'reposts', 'liked'], {
    message: 'Filter must be either media, tagged, reposts, or likes',
  })
  @IsOptional()
  filter?: 'media' | 'tagged' | 'reposts' | 'liked';
}
