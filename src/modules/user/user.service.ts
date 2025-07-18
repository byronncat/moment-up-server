import { accounts } from '../../__mocks__/auth';
import { follows } from '../../__mocks__/follow';
import type { User, Follow } from 'schema';
import type { GoogleUser } from 'library';

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Auth } from 'src/common/helpers';

@Injectable()
export class UserService {
  private readonly accounts = accounts;
  private readonly follows = follows;

  public async getById(sub: string | undefined): Promise<User | undefined> {
    return this.accounts.find(
      (account) => account.id === sub || account.username === sub || account.email === sub
    ) as User | undefined;
  }

  public async addCredentialUser(
    userData: Required<Pick<User, 'email' | 'username' | 'password'>>
  ): Promise<User> {
    const newUser: User = {
      id: Auth.generateId('uuid'),
      username: userData.username,
      displayName: userData.username,
      email: userData.email,
      password: userData.password,
      blocked: false,
      verified: false,
      hasFeed: false,
      avatar: null,
      backgroundImage: null,
      bio: null,
      created_at: new Date(),
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
      hasFeed: false,
      password: null,
      avatar: googleData.picture || null,
      backgroundImage: null,
      bio: null,
      created_at: new Date(),
    };

    this.accounts.push(newUser);
    return newUser;
  }

  public async updatePassword(userId: string, hashedPassword: string): Promise<User | null> {
    const userIndex = this.accounts.findIndex((account) => account.id === userId);
    if (userIndex === -1) return null;

    this.accounts[userIndex].password = hashedPassword;
    return this.accounts[userIndex] as User;
  }

  public async verifyEmail(userId: string): Promise<User | null> {
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
      created_at: new Date(),
    };
    this.follows.push(newFollow);
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
