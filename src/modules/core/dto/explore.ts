import { IntersectionType } from '@nestjs/mapped-types';
import { LimitDto, PageDto } from 'src/common/validators';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ExploreType } from 'src/common/constants';

export class ExploreDto extends IntersectionType(PageDto, LimitDto) {
  @IsEnum(ExploreType, {
    message: `Type must be one of: ${Object.values(ExploreType).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Type is required' })
  type: ExploreType;

  page = 1;
  limit = 30;
}
