import type { StoryNotificationPayload, StoryPayload } from 'api';
import { getRandomFile, soundUrl } from './file';
import { faker } from '@faker-js/faker';
import { accounts } from './auth';

const myMockStory: StoryNotificationPayload = {
  id: faker.string.uuid(),
  userId: accounts[0].id,
  username: accounts[0].username,
  displayName: accounts[0].displayName,
  avatar: accounts[0].avatar,
  viewed: false,
  total: 7,
  createdAt: new Date().toISOString(),
};

export const mockStoryNotifications: StoryNotificationPayload[] = [
  myMockStory,
  ...Array.from({ length: 12 }, () => ({
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

export const mockStories: StoryPayload[] = mockStoryNotifications.map((notification) => {
  // Use index as seed for consistent distribution
  const seedRandom = (seed: number, max: number) => {
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * max);
  };

  const generateStory = (storyId?: string) => {
    // Determine content type: 70% image, 10% text, 20% video
    const contentTypeRand = seedRandom(Math.random() * 10000, 100);
    let contentType: 'image' | 'text' | 'video';
    if (contentTypeRand < 70) contentType = 'image';
    else if (contentTypeRand < 80) contentType = 'text';
    else contentType = 'video';

    // Determine if should have sound: 30% for video, 70% for image/text
    const soundRand = seedRandom(Math.random() * 10000, 100);
    const shouldHaveSound = contentType === 'video' ? soundRand < 30 : soundRand < 70;

    let content: any;
    if (contentType === 'text') {
      content = faker.lorem.paragraph();
    } else if (contentType === 'image') {
      content = {
        id: faker.string.uuid(),
        type: 'image',
        url: getRandomFile(faker.string.uuid(), '4:5'),
        aspectRatio: '4:5',
      };
    } else {
      content = {
        id: faker.string.uuid(),
        type: 'video',
        url: 'https://res.cloudinary.com/dq02xgn2g/video/upload/v1754136062/_mock_/so-what.mp4',
        aspectRatio: '9:16',
      };
    }

    return {
      id: storyId || faker.string.uuid(),
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
