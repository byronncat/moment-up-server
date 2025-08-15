import { IsNotEmpty, IsEnum } from 'class-validator';
import { PaginationDto } from 'src/common/validators';
import { ExploreType } from 'src/common/constants';

export class ExploreDto extends PaginationDto {
  @IsEnum(ExploreType, {
    message: `Type must be one of: ${Object.values(ExploreType).join(', ')}`,
  })
  @IsNotEmpty({ message: 'Type is required' })
  type: ExploreType;
}
