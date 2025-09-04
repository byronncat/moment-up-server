import { accounts } from '../../__mocks__/auth';
import { follows } from '../../__mocks__/follow';
import { getRandomFile } from 'src/__mocks__/file';
import { faker } from '@faker-js/faker';

import type { User, Follow } from 'schema';
import type { AccountPayload, ProfilePayload, UserPayload } from 'api';
import type { GoogleUser } from 'library';

type UniqueUserId = User['id'] | User['email'] | User['username'];

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService, type SelectOptions } from '../database/supabase.service';
import { Auth, String } from 'src/common/helpers';
import { AccountExist, ProfileVisibility } from 'src/common/constants';

@Injectable()
export class UserService {
  private readonly accounts = accounts;
  private readonly follows = follows;

  constructor(private readonly supabaseService: SupabaseService) {}

  public parseToAccountPayload(user: User) {
    const result: AccountPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
    };
    return result;
  }

  public async getById(id: UniqueUserId, options?: Pick<SelectOptions, 'select'>) {
    try {
      const isUuid = String.isUuid(id);
      const users = await this.supabaseService.select<User>('users', {
        select: options?.select,
        caseSensitive: false,
        orWhere: isUuid ? { id } : { username: id, email: id },
      });
      if (users.length === 0) return null;
      return users[0];
    } catch {
      return null;
    }
  }

  public async isAccountExist(email: UniqueUserId, username: UniqueUserId) {
    try {
      const users = await this.supabaseService.select<User>('users', {
        select: 'email, username',
        caseSensitive: false,
        orWhere: { email, username },
      });

      if (users.length > 0) {
        if (email.toLowerCase() === users[0].email) return AccountExist.EMAIL;
        if (username.toLowerCase() === users[0].username) return AccountExist.USERNAME;
      }
      return AccountExist.NONE;
    } catch {
      return AccountExist.NONE;
    }
  }

  public async addCredentialUser(
    userData: Required<Pick<User, 'email' | 'username' | 'password'>>
  ) {
    try {
      const newUser = await this.supabaseService.insert<User>('users', {
        email: userData.email.toLocaleLowerCase(),
        username: userData.username.toLocaleLowerCase(),
        password: userData.password,
      });

      return newUser[0];
    } catch {
      return null;
    }
  }

  public async addGoogleUser(googleData: GoogleUser) {
    const displayName =
      googleData.firstName && googleData.lastName
        ? `${googleData.firstName} ${googleData.lastName}`
        : googleData.email.split('@')[0];

    let username = Auth.generateUsername(googleData.email);
    while (true) {
      const duplicateCount = await this.supabaseService.count('users', { username });
      if (duplicateCount === 0) break;
      username = Auth.generateUsername(googleData.email);
    }

    const newUser = await this.supabaseService.insert<User>('users', {
      username,
      display_name: displayName,
      email: googleData.email,
      blocked: false,
      verified: true,
    });

    return newUser[0];
  }

  public async getAccountById(id: UniqueUserId | undefined) {
    const user: User | undefined = this.accounts.find(
      (acc) => acc.id === id || acc.email === id || acc.username === id
    );
    if (!user) return null;
    const account: AccountPayload = this.parseToAccountPayload(user);
    return account;
  }

  public async getUserPayload(userId: User['id']) {
    const user = await this.getById(userId);
    if (!user) return null;
    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      backgroundImage: faker.datatype.boolean(0.5)
        ? getRandomFile(faker.string.uuid(), '1.91:1')
        : undefined,
      followers: faker.number.int({ min: 0, max: 1000 }),
      following: faker.number.int({ min: 0, max: 1000 }),
      hasStory: faker.datatype.boolean({ probability: 0.5 }),
      isFollowing: faker.datatype.boolean({ probability: 0.5 }),
      bio: faker.lorem.paragraph(),
      followedBy: {
        count: faker.number.int({ min: 0, max: 1000 }),
        displayItems: [
          {
            id: faker.string.uuid(),
            displayName: faker.person.fullName(),
            avatar: getRandomFile(faker.person.fullName()),
          },
        ],
      },
    };
    return payload;
  }

  public async getProfileByUsername(username: User['username']) {
    const user = this.accounts.find((acc) => acc.username === username);
    // if (!user) return null;
    const profile: ProfilePayload = {
      id: user?.id || faker.string.uuid(),
      email: user?.email || faker.internet.email(),
      username: user?.username || username,
      displayName: user?.display_name || faker.person.fullName(),
      avatar: user?.avatar || getRandomFile(username),
      backgroundImage: faker.datatype.boolean(0.5)
        ? getRandomFile(faker.string.uuid(), '1.91:1')
        : undefined,
      bio:
        user?.bio || !user
          ? faker.datatype.boolean({ probability: 0.5 })
            ? faker.lorem.paragraph()
            : null
          : null,
      followers: faker.number.int({ min: 0, max: 1000 }),
      following: faker.number.int({ min: 0, max: 1000 }),
      hasStory: true,
    };
    return profile;
  }

  public async updatePassword(userId: User['id'], hashedPassword: User['password']) {
    const userIndex = this.accounts.findIndex((account) => account.id === userId);
    if (userIndex === -1) return null;

    this.accounts[userIndex].password = hashedPassword;
    return this.accounts[userIndex] as User;
  }

  public async verifyEmail(userId: User['id']) {
    try {
      const user = await this.supabaseService.update<User>(
        'users',
        { verified: true },
        { id: userId }
      );
      return user[0];
    } catch {
      return null;
    }
  }

  public async follow(currentUserId: User['id'], targetUserId: User['id']) {
    // const currentUser = await this.getById(currentUserId);
    // const targetUser = await this.getById(targetUserId);
    const currentUser = {
      id: currentUserId,
    } as User;
    const targetUser = {
      id: targetUserId,
    } as User;

    if (!currentUser || !targetUser) throw new NotFoundException('User not found');
    if (currentUserId === targetUserId) throw new BadRequestException('Cannot follow yourself');

    const existingFollow = this.follows.find(
      (follow) => follow.followerId === currentUserId && follow.followingId === targetUserId
    );
    if (existingFollow) throw new ConflictException('You are already following this user');

    const newFollow: Follow = {
      id: Auth.generateId('uuid'),
      followerId: currentUserId,
      followingId: targetUserId,
      createdAt: new Date(),
    };
    this.follows.push(newFollow);
    return {
      follow: newFollow,
    };
  }

  public async unfollow(currentUserId: User['id'], targetUserId: User['id']) {
    // const currentUser = await this.getById(currentUserId);
    // const targetUser = await this.getById(targetUserId);
    const currentUser = {
      id: currentUserId,
    } as User;
    const targetUser = {
      id: targetUserId,
    } as User;

    if (!currentUser || !targetUser) throw new NotFoundException('User not found');
    if (currentUserId === targetUserId) throw new BadRequestException('Cannot unfollow yourself');

    const existingFollowIndex = this.follows.findIndex(
      (follow) => follow.followerId === currentUserId && follow.followingId === targetUserId
    );
    if (existingFollowIndex === -1) throw new ConflictException('You are not following this user');

    this.follows.splice(existingFollowIndex, 1);
  }
}
