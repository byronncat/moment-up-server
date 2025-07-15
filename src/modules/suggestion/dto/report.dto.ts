import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportDto {
  @IsString({ message: 'Topic ID must be a string' })
  @IsNotEmpty({ message: 'Topic ID is required' })
  topicId: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Report type must be a number' })
  @IsNotEmpty({ message: 'Report type is required' })
  type: number;
}
