import { IntersectionType } from '@nestjs/mapped-types';
import { LimitDto, PageDto } from 'src/common/validators';
import { IsEnum, IsOptional } from 'class-validator';
import { INITIAL_PAGE, SortBy } from 'src/common/constants';

export class PostCommentsDto extends IntersectionType(PageDto, LimitDto) {
  @IsEnum(SortBy, {
    message: `Sort by must be one of: ${Object.values(SortBy).join(', ')}`,
  })
  @IsOptional()
  sortBy: SortBy = SortBy.MOST_LIKED;

  page = INITIAL_PAGE;
  limit = 20;
}
