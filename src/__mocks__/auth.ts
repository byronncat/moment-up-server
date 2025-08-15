import type { User } from 'schema';
import { getRandomFile } from './file';
import { faker } from '@faker-js/faker';
import { ProfileVisibility } from 'src/common/constants';

export const accounts: User[] = [
  {
    id: '5c7f0fcb-42a5-407c-a898-32b505b02e2b',
    username: 'byron',
    displayName: 'Byron Arclight',
    email: 'ByronAT445@gmail.com',
    password: '$2a$12$ixH0oPx0IwNquNZAfsbd..9yo1gh82UZqK7ICIQKl6HV//SXAlARS',
    avatar: getRandomFile(faker.string.uuid()),
    backgroundImage: getRandomFile(faker.string.uuid(), '1.91:1'),
    bio: null,
    verified: true,
    blocked: false,
    profileVisibility: ProfileVisibility.PUBLIC,
    updatedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '1ba21a53-e9cc-4629-8481-00c7f3dd9f63',
    username: 'yuna',
    displayName: 'Yuna',
    email: 'anhthinhncat@gmail.com',
    password: '$2a$12$ixH0oPx0IwNquNZAfsbd..9yo1gh82UZqK7ICIQKl6HV//SXAlARS',
    blocked: false,
    avatar: getRandomFile(faker.string.uuid()),
    backgroundImage: getRandomFile(faker.string.uuid(), '1.91:1'),
    bio: null,
    verified: true,
    profileVisibility: ProfileVisibility.PRIVATE,
    updatedAt: new Date('2024-01-02'),
    createdAt: new Date('2024-01-02'),
  },
  {
    id: '272632b6-0b5a-406a-ad30-88629fd3eabc',
    username: 'Blocked',
    displayName: 'Blocked User',
    email: 'blocked@gmail.com',
    password: '$2a$12$ixH0oPx0IwNquNZAfsbd..9yo1gh82UZqK7ICIQKl6HV//SXAlARS',
    avatar: getRandomFile(faker.string.uuid()),
    bio: null,
    backgroundImage: null,
    verified: true,
    blocked: true,
    profileVisibility: ProfileVisibility.PUBLIC,
    updatedAt: new Date('2024-01-03'),
    createdAt: new Date('2024-01-03'),
  },
];
