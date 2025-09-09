import { LimitDto } from '../../../common/validators';

export class GetTrendingDto extends LimitDto {
  limit = 5;
}
