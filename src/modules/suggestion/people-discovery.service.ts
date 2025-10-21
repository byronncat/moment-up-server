import type { PopularUserDto, UserSummaryDto } from 'api';
import type { User } from 'schema';

import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { UserService } from '../user/user.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';

const DEFAULT_LIMIT = 5;
const POPULAR_LIMIT = 4;

const _mockInitialSuggestions = [
  'd27b1923-3bf4-479c-a749-94f9cb099382',
  '77044989-40e7-4608-8e27-de9d8bee28f4',
  '9e1c7721-c7cb-4dbd-b94d-c53f69625cf4',
];

@Injectable()
export class PeopleDiscoveryService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly userService: UserService
  ) {}

  public async getUser(userId: string): Promise<UserSummaryDto[]> {
    try {
      const suggestions = await this.getUserSuggestions(userId);
      return suggestions;
    } catch (error: any) {
      this.logger.error(error.message, {
        context: 'PeopleDiscovery',
        location: 'getUser',
      });
      return [];
    }
  }

  public async getPopular(userId: string): Promise<PopularUserDto[]> {
    try {
      const excludedUserIds = await this.userService.getExcludedUserIds(userId);
      const trendingUserIds = await this.getTrendingUserIds(userId, POPULAR_LIMIT, excludedUserIds);
      if (trendingUserIds.length === 0) return [];

      // TEMPORARY
      if (this.configService.get('MOCK_DATA') && trendingUserIds.length === 0) {
        trendingUserIds.push(..._mockInitialSuggestions);
      }
      // END TEMPORARY

      const users = await this.supabaseService.select<any>('users', {
        whereIn: { id: trendingUserIds },
        select: 'id, username, display_name, avatar, bio, background_image',
      });

      return users.map((user: any) => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar,
        bio: user.bio,
        backgroundImage: user.background_image,
      })) satisfies PopularUserDto[];
    } catch (error: any) {
      this.logger.error(error.message, {
        context: 'PeopleDiscovery',
        location: 'getPopular',
      });
      return [];
    }
  }

  private async getUserSuggestions(userId: string): Promise<UserSummaryDto[]> {
    const userIds: Array<User['id']> = [];
    const excludedUserIds = await this.userService.getExcludedUserIds(userId);

    // 1. Mutual connections (followed by people you follow)
    const mutualConnections = await this.getMutualConnections(userId, excludedUserIds);
    userIds.push(...mutualConnections);
    mutualConnections.forEach((userId) => excludedUserIds.add(userId));

    // 2. Interests / hashtags (users who post about similar topics)
    if (userIds.length < DEFAULT_LIMIT) {
      const interestBasedUsers = await this.getInterestBasedUsers(userId, excludedUserIds);
      userIds.push(...interestBasedUsers);
      interestBasedUsers.forEach((userId) => excludedUserIds.add(userId));
    }

    // 3. Trending users (people gaining many followers quickly)
    if (userIds.length < DEFAULT_LIMIT) {
      const trendingUsers = await this.getTrendingUserIds(userId, DEFAULT_LIMIT, excludedUserIds);
      userIds.push(...trendingUsers);
      trendingUsers.forEach((userId) => excludedUserIds.add(userId));
    }

    // 4. Random but active users when no strong signals exist
    if (userIds.length < DEFAULT_LIMIT) {
      const activeUserIds = await this.getRandomActiveUsers(excludedUserIds);
      userIds.push(...activeUserIds);
    }

    // TEMPORARY
    if (userIds.length < DEFAULT_LIMIT && this.configService.get('MOCK_DATA')) {
      userIds.push(..._mockInitialSuggestions);
    }
    // END TEMPORARY

    const suggestions = userIds.sort(() => Math.random() - 0.5).slice(0, DEFAULT_LIMIT);
    return this.parseToUserSummaryDto(suggestions, userId);
  }

  private async getMutualConnections(
    userId: string,
    excludedUserIds: Set<string>
  ): Promise<Array<User['id']>> {
    try {
      const { data, error } = await this.supabaseService.getClient().rpc('get_mutual_connections', {
        user_uuid: userId,
        result_limit: DEFAULT_LIMIT,
        excluded_ids: Array.from(excludedUserIds),
      });
      if (error) throw error;

      return data.map((record: { mutual_id: User['id'] }) => record.mutual_id);
    } catch (error: any) {
      this.logger.error(error.message, {
        context: 'PeopleDiscovery',
        location: 'getMutualConnections',
      });
      return [];
    }
  }

  private async getInterestBasedUsers(
    userId: string,
    excludedUserIds: Set<string>
  ): Promise<Array<User['id']>> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .rpc('get_interest_based_users', {
          user_uuid: userId,
          result_limit: DEFAULT_LIMIT,
          excluded_ids: Array.from(excludedUserIds),
        });
      if (error) throw error;

      return data.map((record: { similar_user: string }) => record.similar_user);
    } catch (error: any) {
      this.logger.error(error.message, {
        context: 'PeopleDiscovery',
        location: 'getInterestBasedUsers',
      });
      return [];
    }
  }

  private async getTrendingUserIds(
    userId: string,
    limit: number,
    excludedUserIds?: Set<string>
  ): Promise<Array<User['id']>> {
    try {
      /* Formula:
       * Score = TotalFollowers * log(RecentGrowth + 1)
       *
       * - TotalFollowers provides the base popularity weight
       * - RecentGrowth is log-scaled to reduce dominance of very large values
       * - Adding 1 to avoid log(0) for users with no recent growth
       */

      const { data, error } = await this.supabaseService.getClient().rpc('get_trending_users', {
        user_uuid: userId,
        result_limit: limit,
        excluded_ids: Array.from(excludedUserIds ?? [userId]),
      });
      if (error) throw error;

      return data.map((record: { trending_user: string }) => record.trending_user);
    } catch (error: any) {
      this.logger.error(error.message, {
        context: 'PeopleDiscovery',
        location: 'getTrendingUserIds',
      });
      return [];
    }
  }

  private async getRandomActiveUsers(excludedUserIds: Set<string>): Promise<Array<User['id']>> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .rpc('get_random_active_users', {
          result_limit: DEFAULT_LIMIT,
          excluded_ids: Array.from(excludedUserIds),
        });
      if (error) throw error;

      return data.map((record: { active_user: string }) => record.active_user);
    } catch (error: any) {
      this.logger.error(error.message, {
        context: 'PeopleDiscovery',
        location: 'getRandomActiveUsers',
      });
      return [];
    }
  }

  private async parseToUserSummaryDto(
    userIds: string[],
    currentUserId: string
  ): Promise<UserSummaryDto[]> {
    try {
      if (userIds.length === 0) return [];
      const { data, error } = await this.supabaseService.getClient().rpc('get_user_summary_batch', {
        p_user_ids: userIds,
        p_current_user_id: currentUserId,
        p_mutual_limit: 3,
      });
      if (error) throw error;

      return data.map((user: any) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar,
        bio: user.bio,
        followers: Number(user.followers),
        following: Number(user.following),
        isFollowing: user.is_following,
        hasStory: user.has_story,
        followedBy: user.followed_by,
      }));
    } catch (error: any) {
      this.logger.error(error.message, {
        context: 'PeopleDiscovery',
        location: 'parseToUserSummaryDto',
      });
      return [];
    }
  }
}
