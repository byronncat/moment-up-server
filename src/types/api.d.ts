declare module 'api' {
  import type { User, Moment, CloudinaryFile } from 'schema';
  interface AccountPayload {
    id: User['id'];
    email: User['email'];
    username: User['username'];
    displayName: User['displayName'];
    avatar?: User['avatar'];
  }

  interface MomentData {
    text?: Moment['text'];
    files?: {
      id: string;
      type: CloudinaryFile['type'];
      url: string;
      aspectRatio: '1:1' | '9:16' | '4:5' | '1.91:1';
    }[];
    likes: number;
    comments: number;
    isLiked: boolean;
    isBookmarked: boolean;
    updatedAt: Moment['updatedAt'];
  }

  interface UserData {
    id: User['id'];
    email: User['email'];
    username: User['username'];
    displayName: User['displayName'];
    avatar?: User['avatar'];
    bio?: User['bio'];
    followers: number;
    following: number;
    hasFeed: boolean;
    isFollowing?: boolean;
    followedBy?: {
      count: number;
      displayItems: {
        id: User['id'];
        displayName: User['displayName'];
        avatar?: User['avatar'];
      }[];
    };
  }

  interface MomentPayload {
    id: Moment['id'];
    user: UserData;
    post: MomentData;
  }

  interface PaginationPayload<T> {
    total: number;
    page: number;
    limit: number;
    data: T[];
  }
}
