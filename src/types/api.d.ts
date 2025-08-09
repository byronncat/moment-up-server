declare module 'api' {
  import type { User, Moment, CloudinaryFile, Hashtag, Story } from 'schema';
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
    hasStory: boolean;
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

  interface StoryNotificationPayload {
    id: Story['id'];
    userId: User['id'];
    username: User['username'];
    displayName: User['displayName'];
    avatar?: User['avatar'];
    viewed: boolean;
    total: number;
    createdAt: Story['createdAt'];
  }

  type StoryMediaContent = {
    id: CloudinaryFile['id'];
    type: CloudinaryFile['type'];
    url: CloudinaryFile['url'];
    aspectRatio: '9:16';
  };

  type StoryContent = Exclude<Story['text'], null> | StoryMediaContent;

  type StoryData = {
    id: Story['id'];
    content: StoryContent;
    sound?: CloudinaryFile['url'];
    createdAt: Story['createdAt'];
  };

  interface StoryPayload {
    user: Omit<AccountPayload, 'email'>;
    stories: StoryData[];
  }

  interface PaginationPayload<T> {
    total: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    items: T[];
  }
}
