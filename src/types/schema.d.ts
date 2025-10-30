declare module 'schema' {
  import type {
    ContentPrivacy,
    ContentReportType,
    FollowStatus,
    NotificationType,
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

  interface UserStat {
    readonly user_id: User['id'];
    readonly followers_count: number;
    readonly following_count: number;
    readonly posts_count: number;
    readonly has_story: boolean;
    readonly last_modified: timestamptz;
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

  interface Repost {
    readonly id: snowflake;
    readonly post_id: Post['id'];
    readonly user_id: User['id'];
    caption: string | null;
    privacy: ContentPrivacy;
    readonly created_at: timestamptz;
  }

  interface PostStat {
    readonly post_id: Post['id'];
    readonly likes_count: number;
    readonly comments_count: number;
    readonly reposts_count: number;
    readonly bookmarks_count: number;
    readonly last_modified: timestamptz;
  }

  interface Comment {
    readonly id: snowflake;
    readonly user_id: User['id'];
    readonly post_id: Post['id'];
    text: string;
    last_modified: timestamptz;
    readonly created_at: timestamptz;
  }

  interface CommentStat {
    readonly comment_id: Comment['id'];
    readonly likes_count: number;
    readonly last_modified: timestamptz;
  }

  interface Story {
    readonly id: snowflake;
    readonly user_id: User['id'];
    readonly content: StoryTextContent | StoryMediaContent;
    readonly sound: public_id | null;
    readonly created_at: timestamptz;
  }

  interface StoryTextContent {
    text: string;
    background: StoryBackground;
  }

  interface StoryMediaContent {
    id: public_id;
  }

  interface Hashtag {
    readonly id: serial;
    readonly name: string;
    readonly created_at: timestamptz;
  }

  interface UserReport {
    readonly id: serial;
    readonly user_id: User['id'];
    readonly reporter_id: User['id'];
    readonly type: UserReportType;
    readonly created_at: timestamptz;
  }

  interface PostReport {
    readonly id: serial;
    readonly post_id: Post['id'];
    readonly type: ContentReportType;
    readonly created_at: timestamptz;
  }

  interface TrendingReport {
    readonly id: serial;
    readonly hashtag_id: Hashtag['id'];
    readonly user_id: User['id'];
    readonly type: TrendingReportType;
    readonly created_at: timestamptz;
  }

  interface Notification {
    readonly id: snowflake;
    readonly user_id: User['id'];
    readonly actor_id: User['id'];
    readonly type: NotificationType;
    readonly entity_id: Post['id'] | Comment['id'] | Story['id'] | null;
    readonly created_at: timestamptz;
    readonly read_at: timestamptz | null;
  }

  // === Relationship ===
  interface Follow {
    readonly follower_id: User['id'];
    readonly following_id: User['id'];
    readonly status: FollowStatus;
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

  interface PostLike {
    readonly user_id: User['id'];
    readonly post_id: Post['id'];
    readonly created_at: timestamptz;
  }

  interface PostBookmark {
    readonly user_id: User['id'];
    readonly post_id: Post['id'];
    readonly created_at: timestamptz;
  }

  interface PostHashtag {
    readonly post_id: Post['id'];
    readonly hashtag_id: Hashtag['id'];
  }

  interface CommentLike {
    readonly user_id: User['id'];
    readonly comment_id: Comment['id'];
    readonly created_at: timestamptz;
  }

  // +++ Ongoing below +++
  interface View {
    readonly id: string;
    readonly userId: User['id'];
    readonly storyId: Story['id'];
    readonly createdAt: Date | string;
  }
}
