declare module 'api' {
  import type { User, Moment, CloudinaryFile, Hashtag, Feed } from 'schema';
  interface AccountPayload {
    id: User['id'];
    email: User['email'];
    username: User['username'];
    displayName: User['displayName'];
    avatar?: User['avatar'];
  }

  interface ProfilePayload extends AccountPayload {
    bio?: User['bio'];
    followers: number;
    following: number;
    hasFeed: boolean;
    isFollowing?: boolean;
  }

  interface PostPayload {
    text?: Moment['text'];
    files?: {
      id: string;
      type: CloudinaryFile['type'];
      url: string;
      aspectRatio: '1:1' | '9:16' | '4:5' | '1.91:1';
    }[];
    likes: number;
    comments: number;
    reposts: number;
    isLiked: boolean;
    isBookmarked: boolean;
    updatedAt: Moment['updatedAt'];
  }

  interface UserPayload extends AccountPayload, ProfilePayload {
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
    user: UserPayload;
    post: PostPayload;
  }

  interface HashtagPayload {
    id: Hashtag['id'];
    count: number;
  }

  interface FeedNotificationPayload {
    id: Feed['id'];
    userId: User['id'];
    displayName: User['displayName'];
    avatar?: User['avatar'];
    viewed: boolean;
  }

  interface PaginationPayload<T> {
    total: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    items: T[];
  }
}
