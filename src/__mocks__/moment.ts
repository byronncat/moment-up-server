import type { MomentPayload } from 'api';
import { getRandomFile } from './file';
import { faker } from '@faker-js/faker';

const MAX_FOLLOW_NUM = 70000;
const MAX_LIKE_NUM = 70000;
const MAX_COMMENT_NUM = 70000;
const MAX_REPOST_NUM = 100;

// All images with correct aspect ratios (merged from imagePosts and additionalImages)
const images = [
  // From imagePosts - flattened
  {
    url: 'https://pbs.twimg.com/media/GtQ6RRjb0AA0ZkV?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GrAW1FlXkAAgu1O?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GtbCig-bIAAqvrd?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/Gdtc9TWWYAA7DUE?format=jpg&name=4096x4096',
    aspectRatio: '1.91:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GX4zYoXaUAAb3hr?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GLpnRIWa8AAjVjt?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GKi4QHnboAAJWYV?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/FvWhCjEakAAeQ6C?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GgHsZ5vakAAz5jI?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GHv15bhbwAAXQlJ?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/F1IgZYmagAAbcwm?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GkUVxpLaIAAK5fK?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GDxlKAwbkAAEEH4?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/FbT-hSnaMAITR81?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/Fsh9DaOakAEL7B1?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GgHsVFvbYAU2ZpA?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GTP4USoaYAMKWLD?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GoFJ8_PbYAAGVxY?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GmE2QNobcAE18qo?format=jpg&name=medium',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/F7_0tmmbMAAuv6G?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GgHsRA8akAAeirJ?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GNVppwoakAA3Yxq?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GCpqzHQbwAABMGr?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/F-I4FN2bgAAbsbE?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GLGU7XDbEAADwGY?format=jpg&name=large',
    aspectRatio: '1.91:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GgC22OAaMAAmA9I?format=jpg&name=large',
    aspectRatio: '1.91:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GCsUDkvaQAASmNU?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GllqHMLa4AATGzZ?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GlLNYbPbIAANJjZ?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  // From additionalImages
  {
    url: 'https://pbs.twimg.com/media/Gdm5F3mboAgSG_x?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/Fi2-RJ9acAA7gYr?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GowgbJ9aIAADxvn?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/Ghvkngoa0AAZBHM?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/Gj8UYDjbEAAVJeD?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GmkyyAnaEAA3K9v?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/Gj_e2lNbEAAWF9u?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GjMsVS9a0AA66Tb?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GgLvSHibYAMCR1k?format=jpg&name=large',
    aspectRatio: '1.91:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/Gs_YbumagAAJKWg?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GtErX2oaIAAUAwM?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/FtEzdouaQAARPKN?format=jpg&name=4096x4096',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GicHHmPaYAAfESg?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/FkXOfZCaEAAR2pX?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/FWHk8VgUIAANFcX?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/FgzKZewagAAtE2G?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GN8JrXEaUAAvgQu?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GsxybX8bQAEQ8sW?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GjPNWTNb0AAZvar?format=jpg&name=large',
    aspectRatio: '4:5' as const,
  },
  {
    url: 'https://pbs.twimg.com/media/GgwpklCa0AA8MkD?format=jpg&name=4096x4096',
    aspectRatio: '1:1' as const,
  },
];

// Video URLs with aspect ratios
const videoUrls = [
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    aspectRatio: '1.91:1' as const,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    aspectRatio: '1.91:1' as const,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    aspectRatio: '1.91:1' as const,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    aspectRatio: '1.91:1' as const,
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    aspectRatio: '1.91:1' as const,
  },
];

// Shuffle arrays to randomize order
const shuffledImages = [...images].sort(() => Math.random() - 0.5);
const shuffledVideos = [...videoUrls].sort(() => Math.random() - 0.5);
const allMedia = [...shuffledImages, ...shuffledVideos].sort(() => Math.random() - 0.5);

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
    aspectRatio: '4:5' | '1.91:1' | '1:1' | '9:16';
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
