declare module 'schema' {
  import type { ProfileVisibility, StoryBackground, TrendingReportType } from 'common/constants';

  type uuid = string;
  type timestamptz = Date | string;

  // === Main ===
  type User = {
    readonly id: uuid;
    readonly username: string;
    display_name: string | null;
    email: string;
    password: string | null;
    avatar: string | null;
    background_image: string | null;
    bio: string | null;
    blocked: boolean;
    verified: boolean;
    privacy: ProfileVisibility;
    last_modified: timestamptz;
    readonly created_at: timestamptz;
    deleted_at: timestamptz | null;
  };

  type Post = {
    readonly id: string;
    readonly user_id: User['id'];
    text: string | null;
    last_modified: timestamptz;
    readonly created_at: timestamptz;
  };

  type Story = {
    readonly id: string;
    readonly user_id: User['id'];
    text: StoryTextContent | null;
    media: CloudinaryFile['id'] | null;
    sound: CloudinaryFile['id'] | null;
    readonly created_at: timestamptz;
  };

  interface StoryTextContent {
    text: string;
    background: StoryBackground;
  }

  type Hashtag = {
    readonly id: number;
    readonly name: string;
    readonly created_at: timestamptz;
  };

  type TrendingReport = {
    readonly id: number;
    readonly hashtag_id: Hashtag['id'];
    readonly user_id: User['id'];
    readonly type: TrendingReportType;
    readonly created_at: timestamptz;
  };

  // === Relationship ===
  type PostHashtag = {
    readonly post_id: Moment['id'];
    readonly hashtag_id: Hashtag['id'];
  };

  type Follow = {
    readonly follower_id: User['id'];
    readonly following_id: User['id'];
    readonly created_at: timestamptz;
  };

  // +++ Ongoing +++

  type Comment = {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Moment['id'];
    content: string;
    updatedAt: Date | string;
    readonly createdAt: Date | string;
  };

  type SearchHistory = {
    readonly id: string;
    readonly userId: User['id'];
    readonly type: number; // SearchItemType enum
    readonly query: string;
    readonly createdAt: Date | string;
  };

  // === Relationships ===
  type Block = {
    readonly id: string;
    readonly userId: User['id'];
    readonly blockedUserId: User['id'];
    readonly createdAt: Date | string;
  };

  type MomentLike = {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Moment['id'];
    readonly createdAt: Date | string;
  };

  type CommentLike = {
    readonly id: string;
    readonly userId: User['id'];
    readonly commentId: Comment['id'];
    readonly createdAt: Date | string;
  };

  type Bookmark = {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Moment['id'];
    readonly createdAt: Date | string;
  };

  type Repost = {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Moment['id'];
    comment: string | null;
    audience: number; // Audience enum
    readonly createdAt: Date | string;
  };

  type View = {
    readonly id: string;
    readonly userId: User['id'];
    readonly storyId: Story['id'];
    readonly createdAt: Date | string;
  };

  // === MongoDB ===
  type CloudinaryFile = {
    readonly id: string; // Public ID
    readonly postId: Moment['id'] | Story['id'];
    readonly url: string; // Secure URL
    readonly type: 'image' | 'video' | 'audio';
    readonly format: string;
    readonly width?: number; // For images/videos
    readonly height?: number; // For images/videos
    readonly duration?: number; // For video/audio
  };
}
