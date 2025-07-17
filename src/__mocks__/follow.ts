import type { Follow } from 'schema';
import { Auth } from 'src/common/helpers';

export const follows: Follow[] = [
  {
    id: Auth.generateId('uuid'),
    followerId: 'b7afc2b1-123b-4c34-8e67-2e4a1bc12345', // user from auth mock
    followingId: '057b50c5-4646-42bf-98ea-933c108f2671', // user from suggestion mock
    created_at: new Date('2024-01-15T10:30:00Z'),
  },
  {
    id: Auth.generateId('uuid'),
    followerId: 'b7afc2b1-123b-4c34-8e67-2e4a1bc12345',
    followingId: '8b7c2c17-a3be-47db-b2c6-3070d6b93c96',
    created_at: new Date('2024-02-20T14:45:00Z'),
  },
];
