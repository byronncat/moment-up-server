declare module 'api' {
  import type { Attachment, Comment, Hashtag, Post, Story, User } from 'schema';
  import type { NotificationType, StoryBackground } from 'common/constants';

  interface PaginationDto<T> {
    total?: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    items: T[];
  }

  interface ErrorDto {
    message: string;
    error: string | string[];
    statusCode: number;
    code?: string;
  }

  // === User ===
  interface AccountDto {
    id: User['id'];
    username: User['username'];
    displayName: User['display_name'];
    avatar: User['avatar'];
  }

  interface ProfileDto extends AccountDto {
    bio: User['bio'];
    backgroundImage: User['background_image'];
    followers: number;
    following: number;
    isFollower: boolean;
    isFollowing: boolean;
    isFollowRequest: boolean;
    isMuted: boolean;
    isProtected: boolean;
    hasStory: boolean;
  }

  interface UserSummaryDto extends AccountDto {
    bio: User['bio'];
    followers: number;
    following: number;
    isFollowing: boolean;
    hasStory: boolean;
    followedBy: {
      remainingCount: number;
      displayItems: Array<{
        id: User['id'];
        displayName: User['display_name'];
        avatar: User['avatar'];
      }>;
    } | null;
  }

  type PopularUserDto = AccountDto & Pick<ProfileDto, 'backgroundImage' | 'bio'>;

  // === Core ===
  interface PostDto {
    text: Post['text'];
    files: Array<{
      id: Attachment['id'];
      type: 'image' | 'video';
      aspectRatio: 'square' | 'portrait' | 'landscape';
    }> | null;
    privacy: Post['privacy'];
    likes: number;
    comments: number;
    reposts: number;
    isLiked: boolean;
    isBookmarked: boolean;
    lastModified: Post['last_modified'];
  }

  interface FeedDto {
    id: string;
    user: UserSummaryDto;
    post: PostDto;
  }

  interface CommentDto {
    id: string;
    user: UserSummaryDto;
    text: Comment['text'];
    likes: number;
    isLiked: boolean;
    lastModified: Comment['last_modified'];
  }

  // === Story ===
  interface StoryNotificationPayload {
    id: Story['id'];
    userId: User['id'];
    username: User['username'];
    displayName: User['display_name'];
    avatar: User['avatar'];
    viewed: boolean;
    total: number;
    createdAt: Story['created_at'];
  }

  interface StoryTextContent {
    type: 'text';
    text: string;
    background: StoryBackground;
  }

  interface StoryMediaContent {
    type: 'image' | 'video';
    id: string;
  }

  type StoryContent = StoryTextContent | StoryMediaContent;

  interface StoryPayload {
    id: Story['id'];
    content: StoryContent;
    sound?: string;
    createdAt: Story['createdAt'];
  }

  interface StoryDto {
    user: AccountDto;
    stories: StoryPayload[];
  }

  // === Notification ===
  interface FollowRequestDto {
    type: NotificationType.FOLLOW_REQUEST;
    data: UserSummaryDto;
  }

  type NotificationDto = FollowRequestDto & {
    viewed: boolean;
    createdAt: timestamptz;
  };

  // === Others ===
  interface HashtagDto {
    name: Hashtag['name'];
    count: number;
  }
}
