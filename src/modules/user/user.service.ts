import { accounts } from '../../__mocks__/auth';
import type { User } from 'schema';
import type { GoogleUser } from 'library';

import { Injectable } from '@nestjs/common';
import { authLib } from 'src/common/libraries';

@Injectable()
export class UserService {
  private readonly accounts = accounts;

  public async getById(sub: string | undefined): Promise<User | undefined> {
    return this.accounts.find(
      (account) => account.id === sub || account.username === sub || account.email === sub
    ) as User | undefined;
  }

  public async addCredentialUser(
    userData: Required<Pick<User, 'email' | 'username' | 'password'>>
  ): Promise<User> {
    const newUser: User = {
      id: authLib.generateId('uuid'),
      username: userData.username,
      displayName: userData.username,
      email: userData.email,
      password: userData.password,
      blocked: false,
      verified: false,
      followers: 0,
      following: 0,
      hasFeed: false,
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
      avatar: googleData.picture || '',
      verified: true,
      followers: 0,
      following: 0,
      hasFeed: false,
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
}
