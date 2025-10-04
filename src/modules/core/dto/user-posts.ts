import { IntersectionType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { LimitDto, PageDto } from 'src/common/validators';
import { INITIAL_PAGE } from 'src/common/constants';

export class UserPostsDto extends IntersectionType(PageDto, LimitDto) {
  @IsIn(['media', 'tagged', 'reposts', 'liked'], {
    message: 'Filter must be either media, tagged, reposts, or likes',
  })
  @IsOptional()
  filter?: 'media' | 'tagged' | 'reposts' | 'liked';

  page = INITIAL_PAGE;
  limit = 20;
}
