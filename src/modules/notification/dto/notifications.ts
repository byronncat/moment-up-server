import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from 'src/common/validators';
import { NotificationType } from 'src/common/constants';

export class NotificationsDto extends PaginationDto {
  @IsEnum(NotificationType, {
    message: `Type must be one of: ${Object.values(NotificationType).join(', ')}`,
  })
  @IsOptional()
  type?: NotificationType;
}
