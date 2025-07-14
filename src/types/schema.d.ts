declare module 'schema' {
  type User = {
    readonly id: string;
    readonly username: string;
    displayName: string;
    email: string;
    blocked: boolean;
    verified: boolean;
    hasFeed: boolean;
    password: string | null;
    avatar: string | null;
    backgroundImage: string | null;
    bio: string | null;
    readonly created_at: Date;
  };

  type Hashtag = {
    readonly id: string;
  };

  type Follow = {
    readonly id: string;
    readonly followerId: string;
    readonly followingId: string;
    readonly created_at: Date;
  };
}
