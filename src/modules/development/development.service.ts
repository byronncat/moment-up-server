import type { User } from 'schema';

import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { getRandomFile } from 'src/__mocks__/file';
import { faker } from '@faker-js/faker';
import { ProfileVisibility } from 'src/common/constants';
import { Auth } from 'src/common/helpers';

const DEFAULT_PASSWORD = '1';

@Injectable()
export class DevelopmentService {
  constructor(private readonly supabaseService: SupabaseService) {}

  public async generateUsers(count: number = 10) {
    if (count <= 0) {
      throw new BadRequestException('Count must be greater than 0');
    }

    if (count > 100) {
      throw new BadRequestException('Count cannot exceed 100 users at once');
    }

    const usersToInsert: Omit<User, 'id' | 'created_at' | 'last_modified'>[] = [];

    // Generate additional random users
    const remainingCount = count - usersToInsert.length;
    if (remainingCount > 0) {
      for (let i = 0; i < remainingCount; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const username = faker.internet.username({ firstName, lastName }).toLowerCase();
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();

        const existingUser = await this.supabaseService.select<User>('users', {
          orWhere: { username, email },
          select: 'id',
        });

        if (existingUser.length === 0) {
          usersToInsert.push({
            username,
            display_name: `${firstName} ${lastName}`,
            email,
            password: await Auth.hash(DEFAULT_PASSWORD, 12),
            avatar: getRandomFile(faker.string.uuid()),
            background_image: faker.datatype.boolean(0.7)
              ? getRandomFile(faker.string.uuid(), '1.91:1')
              : null,
            bio: faker.datatype.boolean(0.6) ? faker.lorem.sentence() : null,
            verified: faker.datatype.boolean(0.8),
            blocked: false,
            privacy: faker.helpers.arrayElement([
              ProfileVisibility.PUBLIC,
              ProfileVisibility.PRIVATE,
            ]),
            deleted_at: null,
          });
        }
      }
    }

    if (usersToInsert.length === 0) {
      return {
        message: 'No new users to insert. All requested users already exist.',
        insertedCount: 0,
        users: [],
      };
    }

    try {
      const insertedUsers = await this.supabaseService.insert<User>('users', usersToInsert);

      return {
        message: `Successfully inserted ${insertedUsers.length} users`,
        insertedCount: insertedUsers.length,
        users: insertedUsers.map((user) => ({
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          email: user.email,
          verified: user.verified,
          blocked: user.blocked,
          privacy: user.privacy,
        })),
      };
    } catch (error) {
      throw new BadRequestException('Failed to insert users into database');
    }
  }

  public async generateFollowRelationships(maxFollowsPerUser: number = 5) {
    if (maxFollowsPerUser <= 0) {
      throw new BadRequestException('maxFollowsPerUser must be greater than 0');
    }

    if (maxFollowsPerUser > 50) {
      throw new BadRequestException('maxFollowsPerUser cannot exceed 50');
    }

    try {
      // Get all users from the database
      const users = await this.supabaseService.select<User>('users', {
        select: 'id, username, display_name',
        where: { blocked: false }
      });

      if (users.length < 2) {
        return {
          message: 'Need at least 2 users to create follow relationships',
          relationshipsCreated: 0,
          relationships: []
        };
      }

      const relationshipsToInsert: Array<{ follower_id: string; following_id: string }> = [];
      const existingRelationships = new Set<string>();

      // Get existing follow relationships to avoid duplicates
      const existingFollows = await this.supabaseService.select<{ follower_id: string; following_id: string }>('follows', {
        select: 'follower_id, following_id'
      });

      existingFollows.forEach(follow => {
        existingRelationships.add(`${follow.follower_id}-${follow.following_id}`);
      });

      // Generate follow relationships
      for (const user of users) {
        const followCount = faker.number.int({ min: 1, max: maxFollowsPerUser });
        const potentialFollows = users.filter(u => u.id !== user.id);
        
        // Shuffle and take random users to follow
        const shuffledFollows = faker.helpers.shuffle(potentialFollows);
        const usersToFollow = shuffledFollows.slice(0, followCount);

        for (const userToFollow of usersToFollow) {
          const relationshipKey = `${user.id}-${userToFollow.id}`;
          
          if (!existingRelationships.has(relationshipKey)) {
            relationshipsToInsert.push({
              follower_id: user.id,
              following_id: userToFollow.id
            });
            existingRelationships.add(relationshipKey);
          }
        }
      }

      if (relationshipsToInsert.length === 0) {
        return {
          message: 'No new follow relationships to create. All possible relationships already exist.',
          relationshipsCreated: 0,
          relationships: []
        };
      }

      // Insert the follow relationships
      const insertedRelationships = await this.supabaseService.insert<{ follower_id: string; following_id: string }>('follows', relationshipsToInsert);

      return {
        message: `Successfully created ${insertedRelationships.length} follow relationships`,
        relationshipsCreated: insertedRelationships.length,
        relationships: insertedRelationships.map(rel => {
          const follower = users.find(u => u.id === rel.follower_id);
          const following = users.find(u => u.id === rel.following_id);
          return {
            follower_id: rel.follower_id,
            following_id: rel.following_id,
            follower_username: follower?.username,
            following_username: following?.username
          };
        })
      };
    } catch (error) {
      throw new BadRequestException('Failed to create follow relationships');
    }
  }
}
