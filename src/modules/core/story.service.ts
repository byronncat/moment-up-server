import { mockStories, mockStoryNotifications } from 'src/__mocks__/story';
import type { User } from 'schema';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class StoryService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getStories(userId: User['id']) {
    return mockStoryNotifications;
  }

  public async getStoryByUsername(username: string) {
    const story = mockStories.find((story) => story.user.username === username);
    if (!story) throw new NotFoundException(`Story for user ${username} not found`);
    return story;
  }
}
