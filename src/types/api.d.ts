declare module 'api' {
  import type { Attachment, Comment, Hashtag, Post, Story, User } from 'schema';
  import type { StoryBackground } from 'common/constants';

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
    isMuted: boolean;
    isProtected: boolean;
    hasStory: boolean;
  }

  interface UserSummaryDto
    extends Omit<ProfileDto, 'backgroundImage' | 'isMuted' | 'isProtected' | 'isFollower'> {
    followedBy: {
      remainingCount: number;
      displayItems: Array<{
        id: User['id'];
        displayName: User['display_name'];
        avatar: User['avatar'];
      }>;
    } | null;
  }

  // === Core ===
  interface PostDto {
    text: Post['text'];
    files: Array<{
      id: Attachment['id'];
      type: 'image' | 'video';
      aspectRatio: '1:1' | '4:5' | '1.91:1';
    }> | null;
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

  interface HashtagDto {
    name: Hashtag['name'];
    count: number;
  }

  // +++ TODO: Ongoing +++
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

  interface StoryTextContent {
    type: 'text';
    text: string;
    background: StoryBackground;
  }

  interface StoryMediaContent {
    type: 'image' | 'video';
    id: string;
    url: string;
    aspectRatio: '9:16';
  }

  type StoryContent = StoryTextContent | StoryMediaContent;

  interface StoryData {
    id: Story['id'];
    content: StoryContent;
    sound?: string;
    createdAt: Story['createdAt'];
  }

  interface StoryPayload {
    user: Omit<AccountDto, 'email'>;
    stories: StoryData[];
  }

  interface CommentPayload {
    id: Comment['id'];
    user: UserSummaryDto;
    content: Comment['text'];
    likes: number;
    isLiked: boolean;
    updatedAt: Comment['updated_at'];
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

  interface PaginationDto<T> {
    total?: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    items: T[];
  }
}
