import { IntersectionType } from '@nestjs/mapped-types';
import { LimitDto, PageDto } from 'src/common/validators';
import { INITIAL_PAGE } from 'src/common/constants';

export class PaginationDto extends IntersectionType(PageDto, LimitDto) {
  limit = 20;
  page = INITIAL_PAGE;
}
