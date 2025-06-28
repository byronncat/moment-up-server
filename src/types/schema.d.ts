declare module 'schema' {
  export type User = {
    readonly id: uuidv4;
    username: string;
    email: string;
    password_hash?: string;
    bio?: string;
    profile_picture?: string;
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
