import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AttachmentDto } from 'src/common/validators';
import { ContentPrivacy, StoryBackground, StoryFontFamily } from 'src/common/constants';

export class CreateStoryDto {
  @IsString({ message: 'Text must be a string.' })
  @IsOptional()
  text?: string;

  @IsEnum(StoryFontFamily, {
    message: `Font must be a valid enum value.`,
  })
  @IsOptional()
  font?: StoryFontFamily;

  @IsEnum(StoryBackground, {
    message: `Background must be a valid enum value.`,
  })
  @IsOptional()
  background?: StoryBackground;

  @Type(() => AttachmentDto)
  @ValidateNested()
  @IsOptional()
  attachment?: AttachmentDto;

  @IsString({ message: 'Sound must be a string.' })
  @IsOptional()
  sound?: string;

  @IsEnum(ContentPrivacy, {
    message: `Privacy must be a valid enum value.`,
  })
  @IsNotEmpty({ message: `Privacy is required.` })
  privacy: ContentPrivacy = ContentPrivacy.PUBLIC;
}
