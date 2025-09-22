import { IntersectionType } from '@nestjs/mapped-types';  
import { IsEnum, IsOptional } from 'class-validator';
import { LimitDto, PageDto } from 'src/common/validators';
import { NotificationType } from 'src/common/constants';

export class NotificationsDto extends IntersectionType(PageDto, LimitDto) {
  @IsEnum(NotificationType, {
    message: `Type must be one of: ${Object.values(NotificationType).join(', ')}`,
  })
  @IsOptional()
  type?: NotificationType;
}
