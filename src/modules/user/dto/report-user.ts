import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserReportType } from 'src/common/constants';

export class ReportUserDto {
  @IsEnum(UserReportType, { message: 'Report type must be a valid enum' })
  @IsNotEmpty({ message: 'Report type is required' })
  type: UserReportType;
}
