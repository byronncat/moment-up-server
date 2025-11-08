import type { StoryContent, StoryDto, StoryNotificationPayload, StoryPayload } from 'api';
import { getRandomFile, soundUrl } from './file';
import { faker } from '@faker-js/faker';
import { StoryBackground, StoryFontFamily } from '../common/constants';

const myMockStory: StoryNotificationPayload = {
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  username: faker.internet.username(),
  displayName: faker.person.fullName(),
  avatar: getRandomFile(faker.string.uuid()),
  viewed: false,
  total: 7,
  createdAt: new Date().toISOString(),
};

export const mockStoryNotifications: StoryNotificationPayload[] = [
  myMockStory,
  ...Array.from({ length: 3 }, () => ({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    username: faker.internet.username(),
    displayName: faker.person.fullName(),
    avatar: getRandomFile(faker.string.uuid()),
    viewed: faker.datatype.boolean(),
    total: faker.number.int({ min: 1, max: 5 }),
    createdAt: faker.date.recent().toISOString(),
  })),
];

export const createMockStories = (): Array<
  Omit<StoryDto, 'stories'> & { stories: Array<Omit<StoryPayload, 'id'> & { id: string }> }
> => {
  return mockStoryNotifications.map((notification) => {
    // Use index as seed for consistent distribution
    const seedRandom = (seed: number, max: number) => {
      const x = Math.sin(seed) * 10000;
      return Math.floor((x - Math.floor(x)) * max);
    };

    const generateStory = (storyId?: string) => {
      // Determine content type: 70% image, 10% text, 20% video
      const contentTypeRand = seedRandom(Math.random() * 10000, 100);
      let contentType: 'image' | 'text' | 'video';
      if (contentTypeRand < 50) contentType = 'image';
      else if (contentTypeRand < 90) contentType = 'text';
      else contentType = 'video';

      // Determine if should have sound: 30% for video, 70% for image/text
      const soundRand = seedRandom(Math.random() * 10000, 100);
      const shouldHaveSound = contentType === 'video' ? soundRand < 30 : soundRand < 70;

      let content: StoryContent;
      if (contentType === 'text') {
        content = {
          type: 'text',
          text: faker.lorem.paragraph(),
          background: faker.number.int({
            min: 0,
            max: Object.keys(StoryBackground).length / 2 - 1,
          }),
          font: faker.number.int({
            min: 0,
            max: Object.keys(StoryFontFamily).length / 2 - 1,
          }),
        };
      } else if (contentType === 'image') {
        content = {
          type: 'image',
          id: getRandomFile(faker.string.uuid(), '4:5'),
        };
      } else {
        content = {
          type: 'video',
          id: 'https://res.cloudinary.com/dq02xgn2g/video/upload/v1754136062/_mock_/so-what.mp4',
        };
      }

      return {
        id: storyId ?? faker.string.uuid(),
        content,
        createdAt: faker.date.recent().toISOString(),
        ...(shouldHaveSound && {
          sound: soundUrl[seedRandom(Math.random() * 10000, soundUrl.length)],
        }),
      };
    };

    const storyCount = notification.total;
    const stories = [generateStory(notification.id)];
    for (let i = 1; i < storyCount; i++) {
      stories.push(generateStory());
    }

    return {
      user: {
        id: notification.userId,
        username: notification.username,
        displayName: notification.displayName,
        avatar: notification.avatar,
      },
      stories,
    };
  });
};
