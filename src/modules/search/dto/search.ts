import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Validate } from 'class-validator';
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { INITIAL_PAGE } from 'src/common/constants';

@ValidatorConstraint({ name: 'isValidSearchTypes', async: false })
export class IsValidSearchTypes implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;

    const allowedTypes = ['user', 'post', 'hashtag'];
    const types = value.split('&').map((type) => type.trim());

    const uniqueTypes = [...new Set(types)];
    return (
      uniqueTypes.every((type) => allowedTypes.includes(type)) &&
      uniqueTypes.length === types.length
    );
  }

  defaultMessage() {
    return 'Type must contain only valid values (user, post, hashtag) separated by & with no duplicates';
  }
}

export class SearchDto {
  @IsString({ message: 'Query must be a string' })
  @IsNotEmpty({ message: 'Query is required' })
  query: string;

  @Validate(IsValidSearchTypes)
  @IsOptional()
  type?: string;

  @Type(() => Number)
  @Min(1, { message: 'Page must be greater than 0' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Page must be a number' })
  @IsOptional()
  page: number = INITIAL_PAGE;

  @Type(() => Number)
  @Min(1, { message: 'Limit must be greater than 0' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Limit must be a number' })
  @IsOptional()
  limit: number = 12;
}
