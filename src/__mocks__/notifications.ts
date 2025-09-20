import { faker } from '@faker-js/faker';
import type {
  NotificationPayload,
  SecurityNotificationPayload,
  CommunityNotificationPayload,
} from 'api';
import { getRandomFile } from './file';

// Helper function to generate a security notification
const generateSecurityNotification = (): SecurityNotificationPayload => {
  const id = faker.string.uuid();
  return {
    id,
    type: 'security',
    userId: id,
    createdAt: faker.date.recent({ days: 7 }).toISOString(),
  };
};

// Helper function to generate a community notification
const generateCommunityNotification = (): CommunityNotificationPayload => {
  const userId = faker.string.uuid();
  const username = faker.internet.username();
  const displayName = faker.person.fullName();
  const informationType = faker.helpers.arrayElement(['post', 'mention', 'follow'] as const);

  const baseNotification = {
    id: faker.string.uuid(),
    type: 'social' as const,
    user: {
      email: '',
      id: userId,
      username,
      displayName,
      avatar: getRandomFile(userId),
      bio: faker.helpers.maybe(() => faker.person.bio(), { probability: 0.7 }) || null,
      followers: faker.number.int({ min: 10, max: 50000 }),
      following: faker.number.int({ min: 5, max: 2000 }),
      hasStory: faker.datatype.boolean(),
      followedBy: null,
      isMuted: null,
      isFollowing: null,
    },
    createdAt: faker.date.recent({ days: 30 }).toISOString(),
  };

  if (informationType === 'follow') {
    return {
      ...baseNotification,
      information: {
        type: 'follow',
      },
    };
  }

  return {
    ...baseNotification,
    information: {
      type: informationType,
      content:
        informationType === 'post'
          ? faker.lorem.sentence({ min: 3, max: 15 })
          : `${faker.lorem.words({ min: 2, max: 8 })} **${faker.person.fullName()}**`,
    },
  };
};

// Generate dynamic notifications
export const generateNotifications = (): NotificationPayload[] => {
  const notifications: NotificationPayload[] = [];

  // Generate 1-2 security notifications
  const securityCount = faker.number.int({ min: 1, max: 2 });
  for (let i = 0; i < securityCount; i++) {
    notifications.push(generateSecurityNotification());
  }

  // Generate 8-15 community notifications
  const communityCount = faker.number.int({ min: 8, max: 15 });
  for (let i = 0; i < communityCount; i++) {
    notifications.push(generateCommunityNotification());
  }

  // Sort by creation date (most recent first)
  return notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};
