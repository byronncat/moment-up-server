import type { User } from 'schema';
import { Injectable } from '@nestjs/common';
import { mockFeedNotifications } from 'src/__mocks__/feed';

@Injectable()
export class FeedService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getFeeds(userId: User['id']) {
    return mockFeedNotifications;
  }
}
