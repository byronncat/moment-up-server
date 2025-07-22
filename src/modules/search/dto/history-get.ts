import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class GetHistoryDto {
  @Type(() => Number)
  @Min(1, { message: 'Limit must be greater than 0' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Limit must be a number' })
  @IsOptional()
  limit: number = 12;
}
