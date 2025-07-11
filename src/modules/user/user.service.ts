import { accounts } from '../../__mocks__/auth';

import { Injectable } from '@nestjs/common';
import { authLib } from 'src/common/libraries';

@Injectable()
export class UserService {
  private readonly accounts = accounts;

  public async getById(sub: string | undefined) {
    return this.accounts.find(
      (account) => account.id === sub || account.username === sub || account.email === sub
    );
  }

  public async add(userData: { username: string; email: string; password: string }) {
    const newUser = {
      id: authLib.generateId('uuid'),
      username: userData.username,
      displayName: userData.username,
      email: userData.email,
      password: userData.password,
      blocked: false,
      avatar: '',
      verified: false,
      followers: 0,
      following: 0,
      hasFeed: false,
    };

    this.accounts.push(newUser);
    return newUser;
  }

  public async updatePassword(userId: string, hashedPassword: string) {
    const userIndex = this.accounts.findIndex((account) => account.id === userId);
    if (userIndex === -1) return null;

    this.accounts[userIndex].password = hashedPassword;
    return this.accounts[userIndex];
  }

  public async verifyEmail(userId: string) {
    const userIndex = this.accounts.findIndex((account) => account.id === userId);
    if (userIndex === -1) return null;
    this.accounts[userIndex].verified = true;
    return this.accounts[userIndex];
  }
}
