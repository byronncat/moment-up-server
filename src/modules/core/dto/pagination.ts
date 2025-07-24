import { Type } from 'class-transformer';
import { Min, IsNumber, IsOptional } from 'class-validator';
import { INITIAL_PAGE } from 'src/common/constants';

export class PaginationDto {
  @Type(() => Number)
  @Min(1, { message: 'Page must be greater than 0' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Page must be a number' })
  @IsOptional()
  page: number = INITIAL_PAGE;

  @Type(() => Number)
  @Min(1, { message: 'Limit must be greater than 0' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Limit must be a number' })
  @IsOptional()
  limit: number = 12;
}
