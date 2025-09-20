import type { CommentPayload } from 'api';
import { faker } from '@faker-js/faker';
import { getRandomFile } from './file';

export function createMockComment(): CommentPayload {
  const userId = faker.string.uuid();

  return {
    id: faker.string.uuid(),
    content: faker.lorem.paragraphs({ min: 1, max: 3 }, '\n\n'),
    user: {
      id: userId,
      username: faker.internet.username(),
      displayName: faker.person.fullName(),
      avatar: getRandomFile(userId),
      bio: faker.datatype.boolean(0.7) ? faker.lorem.paragraph() : null,
      followers: faker.number.int({ min: 0, max: 100000 }),
      following: faker.number.int({ min: 0, max: 10000 }),
      isFollowing: faker.datatype.boolean(),
      hasStory: faker.datatype.boolean(),
      followedBy: null,
    },
    likes: faker.number.int({ min: 0, max: 100000 }),
    isLiked: faker.datatype.boolean(),
    updatedAt: faker.date.recent({ days: 365 }).toISOString(),
  };
}

export const createMockComments = (): CommentPayload[] =>
  Array.from({ length: 30 }, () => createMockComment()).sort((a, b) => {
    if (a.likes !== b.likes) return b.likes - a.likes;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
