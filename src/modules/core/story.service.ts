import { createMockStories, mockStoryNotifications } from 'src/__mocks__/story';
import type { Story, StoryMediaContent, StoryTextContent, User } from 'schema';
import type { StoryContent, StoryDto, StoryNotificationPayload, StoryPayload } from 'api';

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { UserService } from '../user/user.service';
import { CreateStoryDto } from './dto/create-story';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class StoryService {
  private storyNotifications = mockStoryNotifications;
  private stories = createMockStories();

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly supabaseService: SupabaseService,
    private readonly userService: UserService
  ) {}

  public async create(storyDto: CreateStoryDto, userId: string) {
    try {
      const hasTextContent =
        storyDto.text !== undefined &&
        storyDto.background !== undefined &&
        storyDto.font !== undefined;
      const hasMediaContent = storyDto.attachment !== undefined;

      if (!hasTextContent && !hasMediaContent)
        throw new BadRequestException(
          'Story must have either text with background or media attachment.'
        );

      let content: StoryTextContent | StoryMediaContent;
      if (hasMediaContent)
        content = {
          id: storyDto.attachment!.id,
        } as StoryMediaContent;
      else
        content = {
          text: storyDto.text!,
          background: storyDto.background!,
          font: storyDto.font!,
        } as StoryTextContent;

      const sound = storyDto.sound ?? null;

      const stories = await this.supabaseService.insert<Story>(
        'stories',
        {
          user_id: userId,
          content,
          sound,
        },
        'id::text,user_id,content,sound,created_at'
      );

      if (stories.length === 0) throw new Error('Failed to create story.');
      const newStory = stories[0];

      await this.userService.updateUserStats(userId, 'has_story', 1);
      return newStory;
    } catch (error) {
      this.logger.error(error.message, {
        context: 'StoryService',
        location: 'create',
      });

      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async getNotifications(userId: string) {
    try {
      const { data: followingWithStories, error: followError } = await this.supabaseService
        .getClient()
        .rpc('get_following_with_stories', {
          p_user_id: userId,
        });

      if (followError) throw followError;
      if (!followingWithStories || followingWithStories.length === 0) return [];

      const notifications: StoryNotificationPayload[] = followingWithStories.map(
        (user: any) =>
          ({
            id: user.latest_story_id,
            userId: user.user_id,
            username: user.username,
            displayName: user.display_name,
            avatar: user.avatar,
            viewed: true, // Temporarily always true
            total: user.story_count,
            createdAt: user.latest_story_created_at,
          }) satisfies StoryNotificationPayload
      );

      return [...notifications, ...mockStoryNotifications];
    } catch (error) {
      this.logger.error(error.message, {
        context: 'StoryService',
        location: 'getNotifications',
      });

      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async getStoryByUsername(username: User['username']) {
    const story = this.stories.find((story) => story.user.username === username);
    if (story) return story;

    try {
      const users = await this.supabaseService.select<User>('users', {
        select: 'id,username,display_name,avatar',
        where: { username },
      });

      if (users.length === 0) throw new NotFoundException(`User @${username} not found`);
      const user = users[0];

      const stories = await this.supabaseService.select<Omit<Story, 'id'> & { id: string }>(
        'stories',
        {
          select: 'id::text,content,sound,created_at',
          where: { user_id: user.id },
          orderBy: { column: 'created_at', ascending: false },
        }
      );

      if (stories.length === 0) throw new NotFoundException(`Story for @${username} not found`);

      const StoryPayload = stories.map((story) => {
        const content = story.content;
        let apiContent: StoryContent;

        if ('text' in content) {
          apiContent = {
            type: 'text',
            text: content.text,
            background: content.background,
          };
        } else {
          const mediaId = content.id;
          const isVideo = mediaId.includes('.mp4') || mediaId.includes('video');
          apiContent = {
            type: isVideo ? 'video' : 'image',
            id: mediaId,
          };
        }

        return {
          id: story.id,
          content: apiContent,
          createdAt: story.created_at,
          ...(story.sound && { sound: story.sound }),
        } satisfies StoryPayload;
      });

      return {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatar: user.avatar,
        },
        stories: StoryPayload,
      } satisfies StoryDto;
    } catch (error) {
      this.logger.error(error.message, {
        context: 'StoryService',
        location: 'getStoryByUsername',
      });

      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async deleteStory(id: string, userId: string) {
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
