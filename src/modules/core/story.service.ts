import { mockStories, mockStoryNotifications } from 'src/__mocks__/story';
import type { Story, User } from 'schema';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class StoryService {
  private stories = mockStories;
  private storyNotifications = mockStoryNotifications;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getStories(userId: User['id']) {
    return mockStoryNotifications;
  }

  public async getStoryByUsername(username: User['username']) {
    const story = this.stories.find((story) => story.user.username === username);
    if (!story) throw new NotFoundException(`Story for ${username} not found`);
    return story;
  }

  public async deleteStory(id: Story['id'], userId: User['id']) {
    const _temp = this.stories.find((story) => story.user.id === userId);
    const story = _temp?.stories.find((s) => s.id === id);

    if (!story) throw new NotFoundException(`Story not found`);
    if (_temp?.user.id !== userId)
      throw new ForbiddenException(`You are not allowed to delete this story`);

    this.stories = this.stories.map((story) => ({
      ...story,
      stories: story.stories.filter((s) => s.id !== id),
    }));
    this.storyNotifications = this.storyNotifications.map((notification) => {
      if (notification.userId === userId) {
        return {
          ...notification,
          id: _temp.stories[1].id,
          total: notification.total - 1,
        };
      }
      return notification;
    });

    return true;
  }
}
