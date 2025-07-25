import type { FeedNotificationPayload } from 'api';
import { getRandomFile } from './file';
import { faker } from '@faker-js/faker';

export const mockFeedNotifications: FeedNotificationPayload[] = Array.from({ length: 16 }, () => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  displayName: faker.person.fullName(),
  avatar: getRandomFile(faker.string.uuid()),
  viewed: faker.datatype.boolean(),
}));
