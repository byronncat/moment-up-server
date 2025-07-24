declare module 'schema' {
  // === SQL ===
  type User = {
    readonly id: string;
    readonly username: string;
    displayName: string;
    email: string;
    blocked: boolean;
    verified: boolean;
    password: string | null;
    avatar: string | null;
    backgroundImage: string | null;
    bio: string | null;
    updatedAt: Date | string;
    readonly createdAt: Date | string;
  };

  type Moment = {
    readonly id: string;
    readonly userId: User['id'];
    text: string | null;
    updatedAt: Date | string;
    readonly createdAt: Date | string;
  };

  type Feed = {
    readonly id: string;
    readonly userId: User['id'];
    text: string | null;
    updatedAt: Date | string;
    readonly createdAt: Date | string;
  };

  type Comment = {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Moment['id'];
    text: string;
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

  type Follow = {
    readonly id: string;
    readonly followerId: User['id'];
    readonly followingId: User['id'];
    readonly createdAt: Date | string;
  };

  type Like = {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Moment['id'];
    readonly createdAt: Date | string;
  };

  type Bookmark = {
    readonly id: string;
    readonly userId: User['id'];
    readonly momentId: Moment['id'];
    readonly createdAt: Date | string;
  };

  type FeedView = {
    readonly id: string;
    readonly userId: User['id'];
    readonly feedId: Feed['id'];
    readonly createdAt: Date | string;
  };

  // === MongoDB ===
  type CloudinaryFile = {
    readonly id: string; // Public ID
    readonly postId: Moment['id'] | Feed['id'];
    readonly url: string; // Secure URL
    readonly type: 'image' | 'video' | 'audio';
    readonly format: string;
    readonly width?: number; // For images/videos
    readonly height?: number; // For images/videos
    readonly duration?: number; // For video/audio
  };
}
