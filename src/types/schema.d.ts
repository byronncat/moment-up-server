declare module 'schema' {
  import type {
    ContentPrivacy,
    ProfileVisibility,
    StoryBackground,
    TrendingReportType,
    UserReportType,
  } from 'common/constants';

  type uuid = string;
  type snowflake = number;
  type serial = number;
  type public_id = string;
  type timestamptz = Date | string;

  // === Main ===
  interface User {
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
  }

  interface Post {
    readonly id: snowflake;
    readonly user_id: User['id'];
    text: string | null;
    attachments: Attachment[] | null;
    privacy: ContentPrivacy;
    last_modified: timestamptz;
    readonly created_at: timestamptz;
  }

  interface Attachment {
    readonly id: public_id;
    readonly type: 'image' | 'video';
  }

  interface Story {
    readonly id: snowflake;
    readonly user_id: User['id'];
    text: StoryTextContent | null;
    media: public_id | null;
    sound: public_id | null;
    readonly created_at: timestamptz;
  }

  interface StoryTextContent {
    text: string;
    background: StoryBackground;
  }

  interface Hashtag {
    readonly id: serial;
    readonly name: string;
    readonly created_at: timestamptz;
  }

  interface UserReport {
    readonly id: serial;
    readonly user_id: User['id'];
    readonly type: UserReportType;
    readonly created_at: timestamptz;
  }

  interface TrendingReport {
    readonly id: serial;
    readonly hashtag_id: Hashtag['id'];
    readonly user_id: User['id'];
    readonly type: TrendingReportType;
    readonly created_at: timestamptz;
  }

  // === Relationship ===
  interface PostHashtag {
    readonly post_id: Post['id'];
    readonly hashtag_id: Hashtag['id'];
  }

  interface Follow {
    readonly follower_id: User['id'];
    readonly following_id: User['id'];
    readonly created_at: timestamptz;
  }

  interface Mute {
    readonly muter_id: User['id'];
    readonly muted_id: User['id'];
    readonly created_at: timestamptz;
  }

  interface Block {
    readonly blocker_id: User['id'];
    readonly blocked_id: User['id'];
    readonly created_at: timestamptz;
  }

  // +++ Ongoing +++

  interface Comment {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Post['id'];
    content: string;
    updatedAt: Date | string;
    readonly createdAt: Date | string;
  }

  interface SearchHistory {
    readonly id: string;
    readonly userId: User['id'];
    readonly type: number; // SearchItemType enum
    readonly query: string;
    readonly createdAt: Date | string;
  }

  // === Relationships ===
  interface MomentLike {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Post['id'];
    readonly createdAt: Date | string;
  }

  interface CommentLike {
    readonly id: string;
    readonly userId: User['id'];
    readonly commentId: Comment['id'];
    readonly createdAt: Date | string;
  }

  interface Bookmark {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Post['id'];
    readonly createdAt: Date | string;
  }

  interface Repost {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Post['id'];
    comment: string | null;
    audience: number; // Audience enum
    readonly createdAt: Date | string;
  }

  interface View {
    readonly id: string;
    readonly userId: User['id'];
    readonly storyId: Story['id'];
    readonly createdAt: Date | string;
  }

  // === MongoDB ===
  interface CloudinaryFile {
    readonly id: string; // Public ID
    readonly postId: Post['id'] | Story['id'];
    readonly url: string; // Secure URL
    readonly type: 'image' | 'video' | 'audio';
    readonly format: string;
    readonly width?: number; // For images/videos
    readonly height?: number; // For images/videos
    readonly duration?: number; // For video/audio
  }
}
