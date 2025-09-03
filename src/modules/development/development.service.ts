import type { User } from 'schema';

import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

@Injectable()
export class DevelopmentService {
  constructor(private readonly supabaseService: SupabaseService) {}

  public async getUsersFromDb() {
    const testId = '5f4e6901-a707-493b-bb79-2a81e60f1c07';
    try {
      return await this.supabaseService.select('users', {
        select: 'id, username, email, display_name, avatar',
        orWhere: { id: testId, username: testId, email: testId },
      });
    } catch (error) {
      throw new BadRequestException('something went wrong');
    }
  }

  public async createUserInDb() {
    const user = {} as User;
    try {
      return await this.supabaseService.insert('users', user);
    } catch (error) {
      throw new BadRequestException('something went wrong');
    }
  }
}
