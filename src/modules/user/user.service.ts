import { accounts } from '../../__mocks__/auth';
import { follows } from '../../__mocks__/follow';
import { getRandomFile } from 'src/__mocks__/file';
import { faker } from '@faker-js/faker';

import type { User, Follow } from 'schema';
import type { AccountPayload, ProfilePayload } from 'api';
import type { GoogleUser } from 'library';

type UniqueUserId = User['id'] | User['email'] | User['username'];

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Auth } from 'src/common/helpers';
import { ProfileVisibility } from 'src/common/constants';

@Injectable()
export class UserService {
  private readonly accounts = accounts;
  private readonly follows = follows;

  public parseToAccountPayload(user: User) {
    const result: AccountPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
    };
    return result;
  }

  public async getById(id: UniqueUserId | undefined) {
    const user: User | undefined = this.accounts.find(
      (account) => account.id === id || account.username === id || account.email === id
    );
    if (!user) return null;
    return user;
  }

  public async getAccountById(id: UniqueUserId | undefined) {
    const user: User | undefined = this.accounts.find(
      (acc) => acc.id === id || acc.email === id || acc.username === id
    );
    if (!user) return null;
    const account: AccountPayload = this.parseToAccountPayload(user);
    return account;
  }

  public async getProfileByUsername(username: User['username']) {
    const user = this.accounts.find((acc) => acc.username === username);
    // if (!user) return null;
    const profile: ProfilePayload = {
      id: user?.id || faker.string.uuid(),
      email: user?.email || faker.internet.email(),
      username: user?.username || username,
      displayName: user?.displayName || faker.person.fullName(),
      avatar: user?.avatar || getRandomFile(username),
      bio: user?.bio || !user ? faker.lorem.paragraph() : null,
      followers: faker.number.int({ min: 0, max: 1000 }),
      following: faker.number.int({ min: 0, max: 1000 }),
      hasFeed: true,
    };
    return profile;
  }

  public async addCredentialUser(
    userData: Required<Pick<User, 'email' | 'username' | 'password'>>
  ) {
    const newUser: User = {
      id: Auth.generateId('uuid'),
      username: userData.username,
      displayName: userData.username,
      email: userData.email,
      password: userData.password,
      avatar: null,
      backgroundImage: null,
      bio: null,
      blocked: false,
      verified: false,
      profileVisibility: ProfileVisibility.PUBLIC,
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    this.accounts.push(newUser);
    return newUser;
  }

  public async addGoogleUser(googleData: GoogleUser) {
    const displayName =
      googleData.firstName && googleData.lastName
        ? `${googleData.firstName} ${googleData.lastName}`
        : googleData.email.split('@')[0];

    const newUser: User = {
      id: googleData.googleId,
      username: googleData.email.split('@')[0],
      displayName,
      email: googleData.email,
      blocked: false,
      verified: true,
      password: null,
      avatar: googleData.picture || null,
      backgroundImage: null,
      bio: null,
      profileVisibility: ProfileVisibility.PUBLIC,
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    this.accounts.push(newUser);
    return newUser;
  }

  public async updatePassword(userId: User['id'], hashedPassword: User['password']) {
    const userIndex = this.accounts.findIndex((account) => account.id === userId);
    if (userIndex === -1) return null;

    this.accounts[userIndex].password = hashedPassword;
    return this.accounts[userIndex] as User;
  }

  public async verifyEmail(userId: User['id']) {
    const userIndex = this.accounts.findIndex((account) => account.id === userId);
    if (userIndex === -1) return null;
    this.accounts[userIndex].verified = true;
    return this.accounts[userIndex] as User;
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
