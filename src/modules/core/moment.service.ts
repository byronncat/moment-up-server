import type { PaginationPayload, MomentPayload } from 'api';
import type { User } from 'schema';
import { mockMoments } from 'src/__mocks__/moment';
import { Injectable } from '@nestjs/common';
import { PaginationDto } from './dto/intdex';

@Injectable()
export class MomentService {
  public async getMoments(userId: User['id'], pageOptions: PaginationDto) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const pagination: PaginationPayload<MomentPayload> = {
      total: mockMoments.length,
      page: pageOptions.page,
      limit: pageOptions.limit,
      hasNextPage: pageOptions.page < Math.ceil(mockMoments.length / pageOptions.limit),
      items: mockMoments.slice(
        (pageOptions.page - 1) * pageOptions.limit,
        pageOptions.page * pageOptions.limit
      ),
    };
    return pagination;
  }
}
