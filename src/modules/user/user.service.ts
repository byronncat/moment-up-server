import { accounts } from '../../__mocks__/auth';

import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly accounts = accounts;

  public async getUser(sub: string) {
    return this.accounts.find(
      (account) => account.id === sub || account.username === sub || account.email === sub
    );
  }
}
