import type { Hashtag, User } from 'schema';
import { getRandomFile } from './file';

interface AccountInfo {
  id: User['id'];
  username: User['username'];
  displayName: User['displayName'];
  avatar?: User['avatar'];
}

interface UserInfo extends AccountInfo {
  bio?: User['bio'];
  backgroundImage?: User['backgroundImage'];
  followers: number;
  following: number;
  hasFeed: boolean;
}

interface UserProfileInfo extends UserInfo {
  isFollowing?: boolean;
}

export interface UserCardDisplayInfo extends Omit<UserProfileInfo, 'backgroundImage'> {
  followedBy?: {
    count: number;
    displayItems: {
      id: string;
      displayName: string;
      avatar?: string;
    }[];
  };
}

export const mockSuggestedUsers: UserCardDisplayInfo[] = [
  {
    id: '057b50c5-4646-42bf-98ea-933c108f2671',
    username: 'wbale0',
    displayName: 'Werner Bale',
    bio: 'Travel photographer | Adventure seeker | Coffee enthusiast',
    followers: 80266,
    following: 93824,
    isFollowing: false,
    hasFeed: true,
    followedBy: {
      displayItems: [
        {
          id: '8b7c2c17-a3be-47db-b2c6-3070d6b93c96',
          displayName: 'Cesar Sloan',
          avatar: getRandomFile('8b7c2c17-a3be-47db-b2c6-3070d6b93c96'),
        },
      ],
      count: 12,
    },
  },
  {
    id: 'ca0f9eb5-c789-4e50-9f8c-457ff3b9f964',
    username: 'tech_jason',
    displayName: 'Jason Chen',
    avatar: getRandomFile('ca0f9eb5-c789-4e50-9f8c-457ff3b9f964'),
    followers: 93824,
    following: 142499,
    isFollowing: false,
    hasFeed: true,
  },
  {
    id: '90946704-51dc-4a73-9f56-99531bc3db7b',
    username: 'foodie_sophie',
    displayName: 'Sophie Rodriguez',
    avatar: getRandomFile('90946704-51dc-4a73-9f56-99531bc3db7b'),
    bio: 'Food blogger | Recipe developer | Always hungry',
    followers: 165155,
    following: 104368,
    isFollowing: false,
    hasFeed: false,
    followedBy: {
      displayItems: [
        {
          id: '7b41edc6-3590-46a9-9eee-88d3f603be0c',
          displayName: 'Mike Brown',
          avatar: getRandomFile('7b41edc6-3590-46a9-9eee-88d3f603be0c'),
        },
        {
          id: '2a204883-b417-4d6b-b5df-c3c6184f4de6',
          displayName: 'Alex Smith',
          avatar: getRandomFile('2a204883-b417-4d6b-b5df-c3c6184f4de6'),
        },
      ],
      count: 2,
    },
  },
  {
    id: '92a1e004-8ddf-46ab-8811-28a6e1bb7a60',
    username: 'fitness_marcus',
    displayName: 'Marcus Johnson',
    avatar: getRandomFile('92a1e004-8ddf-46ab-8811-28a6e1bb7a60'),
    bio: 'Personal trainer | Nutrition coach | Wellness advocate',
    followers: 106734,
    following: 193847,
    isFollowing: false,
    hasFeed: false,
  },
  {
    id: 'e879fbc3-4438-47c0-a68e-87c6a9e2fa59',
    username: 'artist_maya',
    displayName: 'Maya Patel',
    avatar: getRandomFile('e879fbc3-4438-47c0-a68e-87c6a9e2fa59'),
    bio: 'Digital artist | Illustrator | Dreamer',
    followers: 13871,
    following: 5475,
    isFollowing: false,
    hasFeed: true,
    followedBy: {
      displayItems: [
        {
          id: 'b154dc99-9ecf-427f-9e81-faca1bcd3603',
          displayName: 'Sarah Jones',
          avatar: getRandomFile('b154dc99-9ecf-427f-9e81-faca1bcd3603'),
        },
        {
          id: '66258213-11b2-4646-b7d6-20bf47379881',
          displayName: 'Wynn Tumility',
          avatar: getRandomFile('66258213-11b2-4646-b7d6-20bf47379881'),
        },
        {
          id: '19a73186-4d88-41d8-8565-60bb19433b18',
          displayName: 'Helyn Vooght',
          avatar: getRandomFile('19a73186-4d88-41d8-8565-60bb19433b18'),
        },
      ],
      count: 67,
    },
  },
  {
    id: '6a5d499b-073e-4253-890b-2f739b1de380',
    username: 'music_noah',
    displayName: 'Noah Garcia',
    avatar: getRandomFile('6a5d499b-073e-4253-890b-2f739b1de380'),
    bio: 'Music producer | DJ | Creating vibes',
    followers: 176096,
    following: 758,
    isFollowing: false,
    hasFeed: true,
    followedBy: {
      displayItems: [
        {
          id: '1524663d-ae03-43bc-80f3-488594f466fd',
          displayName: 'Rosalie Rizon',
          avatar: getRandomFile('1524663d-ae03-43bc-80f3-488594f466fd'),
        },
        {
          id: '7911e7fa-2371-4914-9f1f-c7b266951dbe',
          displayName: 'Karoly Faragher',
          avatar: getRandomFile('7911e7fa-2371-4914-9f1f-c7b266951dbe'),
        },
      ],
      count: 15,
    },
  },
  {
    id: '6a635b66-9923-4539-8a9c-5a12a14f879b',
    username: 'writer_olivia',
    displayName: 'Olivia Thompson',
    avatar: getRandomFile('6a635b66-9923-4539-8a9c-5a12a14f879b'),
    followers: 17382,
    following: 623,
    isFollowing: false,
    hasFeed: false,
    followedBy: {
      displayItems: [
        {
          id: '19a73186-4d88-41d8-8565-60bb19433b18',
          displayName: 'Alex Smith',
          avatar: getRandomFile('19a73186-4d88-41d8-8565-60bb19433b18'),
        },
      ],
      count: 1,
    },
  },
  {
    id: 'ffaeecbd-58a5-4235-95f5-f51c2471a842',
    username: 'huhi_1211',
    displayName: 'huhi | fevercell',
    avatar: getRandomFile('ffaeecbd-58a5-4235-95f5-f51c2471a842'),
    bio: 'Novelist | Poet | Storyteller',
    followers: 17382,
    following: 623,
    isFollowing: false,
    hasFeed: false,
    followedBy: {
      displayItems: [
        {
          id: 'ffaeecbd-58a5-4235-95f5-f51c2471a842',
          displayName: 'Alex Smith',
          avatar: getRandomFile('ffaeecbd-58a5-4235-95f5-f51c2471a842'),
        },
      ],
      count: 1,
    },
  },
];

export interface HashtagItem extends Hashtag {
  count: number;
}

export const mockTrendingTopics: HashtagItem[] = [
  {
    id: 'ChatGPT',
    count: Math.floor(Math.random() * 1000000) + 1000000,
    createdAt: new Date(),
  },
  {
    id: '2025',
    count: Math.floor(Math.random() * 1000000) + 1000000,
    createdAt: new Date(),
  },
  {
    id: 'javascript',
    count: Math.floor(Math.random() * 1000000) + 1000000,
    createdAt: new Date(),
  },
  {
    id: 'play',
    count: Math.floor(Math.random() * 1000000) + 1000000,
    createdAt: new Date(),
  },
  {
    id: 'beauty',
    count: Math.floor(Math.random() * 1000000) + 1000000,
    createdAt: new Date(),
  },
];
