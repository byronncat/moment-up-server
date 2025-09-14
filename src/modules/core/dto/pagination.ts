import { IntersectionType } from '@nestjs/mapped-types';
import { LimitDto, PageDto } from 'src/common/validators';

export class PaginationDto extends IntersectionType(PageDto, LimitDto) {
  limit = 20;
}
