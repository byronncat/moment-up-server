import { IsEnum, IsNotEmpty } from 'class-validator';
import { ContentReportType } from 'src/common/constants';

export class ReportPostDto {
  @IsEnum(ContentReportType, { message: 'Report type must be a valid enum' })
  @IsNotEmpty({ message: 'Report type is required' })
  type: ContentReportType;
}
