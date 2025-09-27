import { IntersectionType } from '@nestjs/mapped-types';
import { LimitDto, PageDto } from 'src/common/validators';
import { INITIAL_PAGE } from 'src/common/constants';

export class FollowPaginationDto extends IntersectionType(PageDto, LimitDto) {
  page = INITIAL_PAGE;
  limit = 30;
}
