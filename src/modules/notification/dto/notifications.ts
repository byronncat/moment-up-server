import { IntersectionType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { LimitDto, PageDto } from 'src/common/validators';
import { INITIAL_PAGE, NotificationType } from 'src/common/constants';

export class NotificationsDto extends IntersectionType(PageDto, LimitDto) {
  @IsEnum(['follow_request'], {
    message: `Type must be one of: ${Object.values(NotificationType).join(', ')}.`,
  })
  @IsOptional()
  type?: NotificationType;

  page = INITIAL_PAGE;
  limit = 20;
}
