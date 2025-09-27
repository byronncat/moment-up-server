import { IntersectionType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { LimitDto, PageDto } from 'src/common/validators';

export class ProfileFeedDto extends IntersectionType(PageDto, LimitDto) {
  page = 1;
  limit = 20;

  @IsIn(['media', 'tagged', 'reposts', 'liked'], {
    message: 'Filter must be either media, tagged, reposts, or likes',
  })
  @IsOptional()
  filter?: 'media' | 'tagged' | 'reposts' | 'liked';
}
