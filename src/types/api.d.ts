declare module 'api' {
  import type { User, Moment, CloudinaryFile, Hashtag, Story, Comment } from 'schema';
  import type { StoryBackground } from 'common/constants';

  interface AccountDto {
    id: User['id'];
    username: User['username'];
    displayName: User['display_name'];
    avatar: User['avatar'];
  }

  interface ProfileDto extends AccountDto {
    bio?: User['bio'];
    backgroundImage?: User['background_image'];
    followers: number;
    following: number;
    isFollowing?: boolean;
    isProtected: boolean;
    hasStory: boolean;
  }

  interface UserSummaryDto extends AccountDto, Omit<ProfileDto, 'backgroundImage' | 'isProtected'> {
    followedBy?: {
      count: number;
      displayItems: {
        id: User['id'];
        displayName: User['display_name'];
        avatar?: User['avatar'];
      }[];
    };
  }

  interface PostPayload {
    text?: Moment['text'];
    files?: {
      id: string;
      type: CloudinaryFile['type'];
      url: string;
      aspectRatio: '1:1' | '9:16' | '4:5' | '1.91:1';
    }[];
    likes: number;
    comments: number;
    reposts: number;
    isLiked: boolean;
    isBookmarked: boolean;
    updatedAt: Moment['updatedAt'];
  }

  interface MomentPayload {
    id: Moment['id'];
    user: UserSummaryDto;
    post: PostPayload;
  }

  interface HashtagDto {
    name: Hashtag['name'];
    count: number;
  }

  interface StoryNotificationPayload {
    id: Story['id'];
    userId: User['id'];
    username: User['username'];
    displayName: User['display_name'];
    avatar: User['avatar'];
    viewed: boolean;
    total: number;
    createdAt: Story['createdAt'];
  }

  type StoryTextContent = {
    type: 'text';
    text: string;
    background: StoryBackground;
  };

  type StoryMediaContent = {
    type: Exclude<CloudinaryFile['type'], 'audio'>;
    id: CloudinaryFile['id'];
    url: CloudinaryFile['url'];
    aspectRatio: '9:16';
  };

  type StoryContent = StoryTextContent | StoryMediaContent;

  type StoryData = {
    id: Story['id'];
    content: StoryContent;
    sound?: CloudinaryFile['url'];
    createdAt: Story['createdAt'];
  };

  interface StoryPayload {
    user: Omit<AccountDto, 'email'>;
    stories: StoryData[];
  }

  interface CommentPayload {
    id: Comment['id'];
    user: UserSummaryDto;
    content: Comment['content'];
    likes: number;
    isLiked: boolean;
    updatedAt: Comment['updatedAt'];
  }

  interface SecurityNotificationPayload {
    id: string;
    type: 'security';
    userId: string;
    createdAt: string;
  }

  interface CommunityNotificationPayload {
    id: string;
    type: 'social';
    user: UserSummaryDto;
    createdAt: string;
    information:
      | {
          type: 'post' | 'mention';
          content: string;
        }
      | {
          type: 'follow';
        };
  }

  type NotificationPayload = SecurityNotificationPayload | CommunityNotificationPayload;

  interface PopularProfileDto
    extends Omit<ProfileDto, 'followers' | 'following' | 'hasStory' | 'isFollowing'> {
    backgroundImage?: string;
  }

  interface PaginationPayload<T> {
    total: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    items: T[];
  }
}
