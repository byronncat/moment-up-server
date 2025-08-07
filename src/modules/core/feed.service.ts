import { mockFeeds, mockFeedNotifications } from 'src/__mocks__/feed';
import type { User } from 'schema';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class FeedService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getFeeds(userId: User['id']) {
    return mockFeedNotifications;
  }

  public async getFeed(userId: User['id']) {
    const feed = mockFeeds.find((feed) => feed.user.id === userId);
    if (!feed) throw new NotFoundException(`Feed for user ${userId} not found`);
    return feed;
  }
}
