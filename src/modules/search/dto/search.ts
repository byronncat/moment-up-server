import { IntersectionType } from '@nestjs/mapped-types';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { INITIAL_PAGE } from 'src/common/constants';
import { LimitDto, PageDto } from 'src/common/validators';

@ValidatorConstraint({ name: 'isValidSearchTypes', async: false })
export class IsValidSearchFilters implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;

    const allowedFilters = ['user', 'post', 'media'];
    const filters = value.split('&').map((filter) => filter.trim());

    const uniqueFilters = [...new Set(filters)];
    return (
      uniqueFilters.every((filter) => allowedFilters.includes(filter)) &&
      uniqueFilters.length === filters.length
    );
  }

  defaultMessage() {
    return 'Filter must contain only valid values (user, post, media) separated by & with no duplicates';
  }
}

export class SearchDto extends IntersectionType(LimitDto, PageDto) {
  @IsString({ message: 'Query must be a string' })
  @IsNotEmpty({ message: 'Query is required' })
  query: string;

  @Validate(IsValidSearchFilters)
  @IsOptional()
  filter?: string;

  page = INITIAL_PAGE;
  limit = 12;
}
