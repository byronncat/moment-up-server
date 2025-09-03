declare module 'schema' {
  import type { ProfileVisibility, StoryBackground } from 'common/constants';

  type uuid = string;
  type timestamptz = Date | string;

  // === SQL ===
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
    readonly last_modified: timestamptz;
    readonly createdAt: timestamptz;
  };

  // +++ Ongoing +++

  type Moment = {
    readonly id: string;
    readonly userId: User['id'];
    text: string | null;
    updatedAt: Date | string;
    readonly createdAt: Date | string;
  };

  interface TextContent {
    text: string;
    background: StoryBackground;
  }

  interface MediaContent {
    id: CloudinaryFile['id'];
  }

  type Story = {
    readonly id: string;
    readonly userId: User['id'];
    content: TextContent | MediaContent;
    sound: CloudinaryFile['id'] | null;
    readonly createdAt: Date | string;
  };

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

  type Hashtag = {
    readonly id: string;
    readonly createdAt: Date | string;
  };

  // === Relationships ===
  type Block = {
    readonly id: string;
    readonly userId: User['id'];
    readonly blockedUserId: User['id'];
    readonly createdAt: Date | string;
  };

  type Follow = {
    readonly id: string;
    readonly followerId: User['id'];
    readonly followingId: User['id'];
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
