import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TrendingReportType } from '../../../common/constants';

export class TrendingReportDto {
  @IsString({ message: 'Topic must be a string' })
  @IsNotEmpty({ message: 'Topic is required' })
  topic: string;

  @Type(() => Number)
  @IsEnum(TrendingReportType, { message: 'Report type must be a valid enum value' })
  @IsNotEmpty({ message: 'Report type is required' })
  type: TrendingReportType;
}
