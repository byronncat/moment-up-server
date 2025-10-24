import { Type } from 'class-transformer';
import { IsEnum, IsString } from 'class-validator';
import { ContentPrivacy } from 'src/common/constants';

export class UpdatePostDto {
  @IsString({ message: 'Text must be a string.' })
  text: string;

  @Type(() => Number)
  @IsEnum(ContentPrivacy, { message: 'Content privacy must be a valid enum value.' })
  privacy: ContentPrivacy;
}
