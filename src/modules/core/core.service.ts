import { Injectable } from '@nestjs/common';
import { mockMoments } from 'src/__mocks__/moment';

@Injectable()
export class CoreService {
  public async getMoments(page: number) {
    return {
      items: mockMoments.slice(page * 10, (page + 1) * 10),
      hasNextPage: page < mockMoments.length / 10,
    };
  }
}
