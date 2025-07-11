declare module 'schema' {
  export type User = {
    readonly id: string;
    readonly username: string;
    displayName: string;
    email: string;
    blocked: boolean;
    verified: boolean;
    followers: number;
    following: number;
    hasFeed: boolean;
    password?: string;
    avatar?: string;
    bio?: string;
    readonly created_at: Date;
  };

  export type Moment = {
    readonly id: serial;
    readonly user_id: User['id'];
    caption?: string;
    files: string[];
    readonly created_at: Date;
  };

  export type Comment = {
    readonly id: serial;
    readonly moment_id: Moment['id'];
    readonly user_id: User['id'];
    content: string;
    readonly created_at: Date;
  };
}
