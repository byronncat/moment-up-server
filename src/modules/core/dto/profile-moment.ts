import { IntersectionType } from '@nestjs/mapped-types';
import { IsOptional, IsIn } from 'class-validator';
import { LimitDto, PageDto } from 'src/common/validators';

export class ProfileMomentDto extends IntersectionType(PageDto, LimitDto) {
  @IsIn(['media', 'tagged', 'reposts', 'liked'], {
    message: 'Filter must be either media, tagged, reposts, or likes',
  })
  @IsOptional()
  filter?: 'media' | 'tagged' | 'reposts' | 'liked';
}
