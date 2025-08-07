import type { MomentPayload } from 'api';
import { getRandomFile, imageUrls, videoUrls } from './file';
import { faker } from '@faker-js/faker';

const MAX_FOLLOW_NUM = 70000;
const MAX_LIKE_NUM = 70000;
const MAX_COMMENT_NUM = 70000;
const MAX_REPOST_NUM = 100;

const allMedia = [...imageUrls, ...videoUrls].sort(() => Math.random() - 0.5);

// Helper function to create a user
function createRandomUser() {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    username: faker.helpers.arrayElement([
      faker.internet.username(),
      `${faker.food.meat().toLowerCase().replace(' ', '_')}_${faker.person.firstName().toLowerCase()}`,
      `${faker.music.genre().toLowerCase().replace(' ', '_')}_${faker.person.firstName().toLowerCase()}`,
      `${faker.animal.type().toLowerCase().replace(' ', '_')}_${faker.number.int({ min: 100, max: 999 })}`,
      `${faker.color.human().toLowerCase()}${faker.number.int({ min: 10, max: 99 })}`,
    ]),
    displayName: faker.person.fullName(),
    avatar: getRandomFile(faker.string.uuid()),
    followers: faker.number.int({ max: MAX_FOLLOW_NUM }),
    following: faker.number.int({ max: MAX_FOLLOW_NUM }),
    isFollowing: faker.datatype.boolean(),
    hasFeed: faker.datatype.boolean(),
  };
}

// Helper function to create a post
function createRandomPost(
  forceTextOnly = false,
  mediaFiles: Array<{
    id: string;
    type: 'image' | 'video';
    url: string;
    aspectRatio: '4:5' | '1.91:1' | '4:5' | '9:16';
  }> = []
) {
  const hasText = faker.datatype.boolean({ probability: 0.7 });

  return {
    ...(hasText && {
      text: faker.helpers.arrayElement([
        faker.lorem.sentence(),
        faker.lorem.paragraph(),
        `${faker.hacker.phrase()} #${faker.food.meat().toLowerCase().replace(' ', '')} #${faker.music.genre().toLowerCase().replace(' ', '')}`,
        `Just ${faker.hacker.ingverb()} with ${faker.food.dish().toLowerCase()} and ${faker.animal.type().toLowerCase()}! 🔥`,
        `${faker.company.buzzPhrase()} #${faker.color.human().toLowerCase()} #${faker.vehicle.type().toLowerCase().replace(' ', '')}`,
      ]),
    }),
    ...(!forceTextOnly && mediaFiles.length > 0 && { files: mediaFiles }),
    likes: faker.number.int({ max: MAX_LIKE_NUM }),
    comments: faker.number.int({ max: MAX_COMMENT_NUM }),
    reposts: faker.number.int({ max: MAX_REPOST_NUM }),
    updatedAt: faker.date.past(),
    isLiked: faker.datatype.boolean({ probability: 0.3 }),
    isBookmarked: faker.datatype.boolean({ probability: 0.2 }),
  };
}

// Generate moments
const moments: MomentPayload[] = [];
let mediaIndex = 0;

// Create media posts until all media files are used
while (mediaIndex < allMedia.length) {
  const filesPerPost = faker.number.int({ min: 1, max: 6 });
  const mediaFilesForPost = [];

  // Get 1-6 media files for this post
  for (let i = 0; i < filesPerPost && mediaIndex < allMedia.length; i++) {
    const media = allMedia[mediaIndex];
    mediaFilesForPost.push({
      id: i.toString(),
      type: media.url.includes('.mp4') ? ('video' as const) : ('image' as const),
      url: media.url,
      aspectRatio: media.aspectRatio,
    });
    mediaIndex++;
  }

  // Create moment with this group of files
  moments.push({
    id: faker.string.uuid(),
    user: createRandomUser(),
    post: createRandomPost(false, mediaFilesForPost),
  });
}

// Calculate text-only posts (half the number of media posts)
const textOnlyPosts = Math.floor(moments.length / 2);

// Add text-only posts
for (let i = 0; i < textOnlyPosts; i++) {
  moments.push({
    id: faker.string.uuid(),
    user: createRandomUser(),
    post: createRandomPost(true), // Force text only
  });
}

// Shuffle all moments for random order
export const mockMoments: MomentPayload[] = moments.sort(() => Math.random() - 0.5);
