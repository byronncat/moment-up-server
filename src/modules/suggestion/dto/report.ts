import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportType } from '../../../common/constants';

export class ReportDto {
  @IsString({ message: 'Topic ID must be a string' })
  @IsNotEmpty({ message: 'Topic ID is required' })
  topicId: string;

  @Type(() => Number)
  @IsEnum(ReportType, { message: 'Report type must be a valid enum value' })
  @IsNotEmpty({ message: 'Report type is required' })
  type: ReportType;
}
