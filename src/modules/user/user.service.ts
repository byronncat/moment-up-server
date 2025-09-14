import { getRandomFile } from 'src/__mocks__/file';
import { faker } from '@faker-js/faker';

import type { User, Follow } from 'schema';
import type { ProfileDto, UserSummaryDto } from 'api';
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
  constructor(private readonly supabaseService: SupabaseService) {}

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
      const usernameExists = await this.supabaseService.exists('users', { where: { username } });
      if (!usernameExists) break;
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

  public async getUserSummaryDto(userId: User['id'], currentUserId?: User['id']) {
    const user = await this.getById(userId);
    if (!user) return null;

    // Get real follower/following counts
    const [followerCount, followingCount] = await Promise.all([
      this.getFollowerCount(userId),
      this.getFollowingCount(userId),
    ]);

    // Check if current user is following this user
    const isFollowing = currentUserId ? await this.isFollowing(currentUserId, userId) : false;

    // Get some followers for display
    const followers = await this.getFollowers(userId, 3);

    const payload: UserSummaryDto = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar,
      followers: followerCount,
      following: followingCount,
      hasStory: faker.datatype.boolean({ probability: 0.5 }),
      isFollowing,
      bio: faker.lorem.paragraph(),
      followedBy: {
        count: followerCount,
        displayItems: followers.map((follower) => ({
          id: follower.id,
          displayName: follower.display_name || follower.username,
          avatar: follower.avatar || getRandomFile(follower.username),
        })),
      },
    };
    return payload;
  }

  public async getProfileByUsername(username: User['username'], currentUserId?: User['id']) {
    try {
      const user = await this.getById(username);
      if (!user) return null;

      let isFollowing = false;
      if (currentUserId) isFollowing = await this.isFollowing(currentUserId, user.id);

      const [followerCount, followingCount] = await Promise.all([
        this.getFollowerCount(user.id),
        this.getFollowingCount(user.id),
      ]);

      const profile: ProfileDto = {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar,
        backgroundImage: faker.datatype.boolean(0.5)
          ? getRandomFile(faker.string.uuid(), '1.91:1')
          : undefined,
        bio:
          user.bio ||
          (faker.datatype.boolean({ probability: 0.5 }) ? faker.lorem.paragraph() : null),
        followers: followerCount,
        following: followingCount,
        isFollowing,
        isProtected: isFollowing ? false : user.privacy === ProfileVisibility.PRIVATE,
        hasStory: true,
      };
      return profile;
    } catch {
      return null;
    }
  }

  public async updatePassword(userId: User['id'], hashedPassword: User['password']) {
    try {
      await this.supabaseService.update<User>(
        'users',
        { password: hashedPassword },
        { id: userId }
      );
      return true;
    } catch {
      return false;
    }
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
    try {
      const allUsersExist = await this.supabaseService.existsAll('users', [
        currentUserId,
        targetUserId,
      ]);
      if (!allUsersExist) throw new NotFoundException('User not found');
      if (currentUserId === targetUserId) throw new BadRequestException('Cannot follow yourself');

      const followExists = await this.supabaseService.exists('follows', {
        where: { follower_id: currentUserId, following_id: targetUserId },
      });
      if (followExists) throw new ConflictException('You are already following this user');

      const newFollow = await this.supabaseService.insert<Follow>('follows', {
        follower_id: currentUserId,
        following_id: targetUserId,
      });

      return newFollow[0];
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      )
        throw error;

      throw new BadRequestException('Failed to follow user');
    }
  }

  public async unfollow(currentUserId: User['id'], targetUserId: User['id']) {
    try {
      const allUsersExist = await this.supabaseService.existsAll('users', [
        currentUserId,
        targetUserId,
      ]);
      if (!allUsersExist) throw new NotFoundException('User not found');
      if (currentUserId === targetUserId) throw new BadRequestException('Cannot unfollow yourself');

      const followExists = await this.supabaseService.exists('follows', {
        where: { follower_id: currentUserId, following_id: targetUserId },
      });
      if (!followExists) throw new ConflictException('You are not following this user');

      await this.supabaseService.delete<Follow>('follows', {
        follower_id: currentUserId,
        following_id: targetUserId,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      )
        throw error;

      throw new BadRequestException('Failed to unfollow user');
    }
  }

  public async isFollowing(currentUserId: User['id'], targetUserId: User['id']): Promise<boolean> {
    try {
      return await this.supabaseService.exists('follows', {
        where: { follower_id: currentUserId, following_id: targetUserId },
      });
    } catch {
      return false;
    }
  }

  public async getFollowerCount(userId: User['id']): Promise<number> {
    try {
      return await this.supabaseService.count('follows', {
        where: { following_id: userId },
      });
    } catch {
      return 0;
    }
  }

  public async getFollowingCount(userId: User['id']): Promise<number> {
    try {
      return await this.supabaseService.count('follows', {
        where: { follower_id: userId },
      });
    } catch (error) {
      return 0;
    }
  }

  public async getFollowers(userId: User['id'], limit = 10, offset = 0): Promise<User[]> {
    try {
      const follows = await this.supabaseService.select<Follow>('follows', {
        where: { following_id: userId },
        limit,
        offset,
        orderBy: { column: 'created_at', ascending: false },
      });

      const followerIds = follows.map((follow) => follow.follower_id);
      if (followerIds.length === 0) return [];

      return await this.supabaseService.select<User>('users', {
        whereIn: { id: followerIds },
        select: 'id, username, display_name, avatar',
      });
    } catch (error) {
      return [];
    }
  }

  public async getFollowing(userId: User['id'], limit = 10, offset = 0): Promise<User[]> {
    try {
      const follows = await this.supabaseService.select<Follow>('follows', {
        where: { follower_id: userId },
        limit,
        offset,
        orderBy: { column: 'created_at', ascending: false },
      });

      const followingIds = follows.map((follow) => follow.following_id);
      if (followingIds.length === 0) return [];

      return await this.supabaseService.select<User>('users', {
        whereIn: { id: followingIds },
        select: 'id, username, display_name, avatar',
      });
    } catch (error) {
      return [];
    }
  }
}
