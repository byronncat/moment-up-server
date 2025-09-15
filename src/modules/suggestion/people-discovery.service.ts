import type { UserSummaryDto, PopularProfileDto } from 'api';
import type { User } from 'schema';

import { Injectable, Inject } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { UserService } from '../user/user.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class PeopleDiscoveryService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly supabaseService: SupabaseService,
    private readonly userService: UserService
  ) {}

  public async getUser(userId: string): Promise<UserSummaryDto[]> {
    try {
      const suggestions = await this.getUserSuggestions(userId);
      return suggestions;
    } catch (error) {
      this.logger.error(error, {
        context: 'PeopleDiscovery',
        location: 'getUser',
      });
      return [];
    }
  }

  public async getPopular(userId: string): Promise<PopularProfileDto[]> {
    try {
      const excludedUserIds = await this.getExcludedUserIds(userId);
      const trendingUserIds = await this.getTrendingUserIds(userId, 4, excludedUserIds);
      if (trendingUserIds.length === 0) return [];

      const users = await this.supabaseService.select<User>('users', {
        whereIn: { id: trendingUserIds },
        select: 'id, username, display_name, avatar, bio',
      });

      return users.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar,
        bio: user.bio,
        backgroundImage: undefined,
        isProtected: false,
        followedBy: null,
        isMuted: null,
        isFollowing: null,
      }));
    } catch (error) {
      this.logger.error(error, {
        context: 'PeopleDiscovery',
        location: 'getPopular',
      });
      return [];
    }
  }

  private async getUserSuggestions(userId: string): Promise<UserSummaryDto[]> {
    const userIds: User['id'][] = [];

    const excludedUserIds = await this.getExcludedUserIds(userId);

    // 1. Mutual connections (followed by people you follow)
    const mutualConnections = await this.getMutualConnections(userId, excludedUserIds);
    userIds.push(...mutualConnections);
    mutualConnections.forEach((userId) => excludedUserIds.add(userId));

    // 2. Interests / hashtags (users who post about similar topics)
    if (userIds.length < 5) {
      const interestBasedUsers = await this.getInterestBasedUsers(userId, excludedUserIds);
      userIds.push(...interestBasedUsers);
      interestBasedUsers.forEach((userId) => excludedUserIds.add(userId));
    }

    // 3. Trending users (people gaining many followers quickly)
    if (userIds.length < 5) {
      const trendingUsers = await this.getTrendingUserIds(userId, 10, excludedUserIds);
      userIds.push(...trendingUsers);
      trendingUsers.forEach((userId) => excludedUserIds.add(userId));
    }

    // 4. Random but active users when no strong signals exist
    if (userIds.length < 5) {
      const activeUserIds = await this.getRandomActiveUsers(excludedUserIds);
      userIds.push(...activeUserIds);
    }

    const suggestions = userIds.sort(() => Math.random() - 0.5).slice(0, 5);
    return await this.parseToUserSummaryDto(suggestions, userId);
  }

  private async getExcludedUserIds(userId: string): Promise<Set<string>> {
    const excludedUserIds = new Set([userId]);

    try {
      // Exclude users that the current user is already following
      const followingData = await this.supabaseService.select('follows', {
        select: 'following_id',
        where: { follower_id: userId },
      });
      followingData?.forEach((f) => excludedUserIds.add(f.following_id));

      // Exclude users that the current user has blocked
      const blockedData = await this.supabaseService.select('blocks', {
        select: 'blocked_id',
        where: { blocker_id: userId },
      });
      blockedData?.forEach((b) => excludedUserIds.add(b.blocked_id));

      // Exclude users that have blocked the current user
      const blockedByData = await this.supabaseService.select('blocks', {
        select: 'blocker_id',
        where: { blocked_id: userId },
      });
      blockedByData?.forEach((b) => excludedUserIds.add(b.blocker_id));

      // Exclude users that the current user has muted
      const mutedData = await this.supabaseService.select('mutes', {
        select: 'muted_id',
        where: { muter_id: userId },
      });
      mutedData?.forEach((m) => excludedUserIds.add(m.muted_id));
    } catch (error) {
      this.logger.error(error, {
        context: 'PeopleDiscovery',
        location: 'getExcludedUserIds',
      });
    }

    return excludedUserIds;
  }

  private async getMutualConnections(
    userId: string,
    excludedUserIds: Set<string>
  ): Promise<User['id'][]> {
    try {
      const followingData = await this.supabaseService.select('follows', {
        select: 'following_id',
        where: { follower_id: userId },
      });

      if (followingData.length === 0) return [];
      const followingIds = followingData.map((f) => f.following_id);

      const client = this.supabaseService.getClient();
      const { data: mutualData, error: mutualError } = await client
        .from('follows')
        .select('following_id')
        .in('follower_id', followingIds)
        .not('following_id', 'in', `(${Array.from(excludedUserIds).join(',')})`);

      if (mutualError || mutualData.length === 0) return [];

      return mutualData.slice(0, 3).map((item) => item.following_id);
    } catch (error) {
      this.logger.error(error, {
        context: 'PeopleDiscovery',
        location: 'getMutualConnections',
      });
      return [];
    }
  }

  private async getInterestBasedUsers(
    userId: string,
    excludedUserIds: Set<string>
  ): Promise<User['id'][]> {
    try {
      const client = this.supabaseService.getClient();

      const { data: userPosts, error: postsError } = await client
        .from('posts')
        .select(
          `
          id,
          post_hashtags (
            hashtags (
              name
            )
          )
        `
        )
        .eq('user_id', userId)
        .order('last_modified', { ascending: false })
        .limit(10);

      if (postsError || userPosts.length === 0) return [];

      const userHashtags = new Set();
      userPosts.forEach((post) => {
        post.post_hashtags?.forEach((ph) => {
          const hashtag = Array.isArray(ph.hashtags) ? ph.hashtags[0] : ph.hashtags;
          if (hashtag?.name) {
            userHashtags.add(hashtag.name);
          }
        });
      });

      if (userHashtags.size === 0) return [];

      const { data: similarUsers, error: similarError } = await client
        .from('post_hashtags')
        .select(
          `
          posts (
            user_id
          ),
          hashtags (
            name
          )
        `
        )
        .in('hashtag_id', Array.from(userHashtags))
        .not('posts.user_id', 'in', `(${Array.from(excludedUserIds).join(',')})`);

      if (similarError || !similarUsers?.length) return [];

      const userScores = new Map();
      similarUsers.forEach((item) => {
        const post = Array.isArray(item.posts) ? item.posts[0] : item.posts;
        const hashtag = Array.isArray(item.hashtags) ? item.hashtags[0] : item.hashtags;

        if (post?.user_id && hashtag?.name) {
          const score = userScores.get(post.user_id) || { userId: post.user_id, commonHashtags: 0 };
          if (userHashtags.has(hashtag.name)) {
            score.commonHashtags++;
          }
          userScores.set(post.user_id, score);
        }
      });

      const sortedUsers = Array.from(userScores.values())
        .sort((a, b) => b.commonHashtags - a.commonHashtags)
        .slice(0, 3);

      return sortedUsers.map((item) => item.userId);
    } catch (error) {
      this.logger.error(error, {
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
  ): Promise<User['id'][]> {
    try {
      const client = this.supabaseService.getClient();
      const excludeIds = excludedUserIds || new Set([userId]);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentFollows, error: followsError } = await client
        .from('follows')
        .select('following_id')
        .gte('last_modified', sevenDaysAgo.toISOString())
        .not('following_id', 'in', `(${Array.from(excludeIds).join(',')})`);

      if (followsError || recentFollows.length === 0) return [];

      const followerGrowth = new Map();
      recentFollows.forEach((follow) => {
        const userId = follow.following_id;
        const count = followerGrowth.get(userId) || { userId, recentFollowGrowth: 0 };
        count.recentFollowGrowth++;
        followerGrowth.set(userId, count);
      });

      const userIds = Array.from(followerGrowth.keys());
      const followerCountPromises = userIds.map((id) => this.userService.getFollowerCount(id));
      const actualFollowCounts = await Promise.all(followerCountPromises);

      const totalFollowerMap = new Map();
      userIds.forEach((id, index) => {
        totalFollowerMap.set(id, actualFollowCounts[index]);
      });

      const scoredUsers = Array.from(followerGrowth.values()).map((item) => {
        const totalFollowers = totalFollowerMap.get(item.userId) || 0;
        const recentGrowth = item.recentFollowGrowth;

        /* Formula:
         * Score = TotalFollowers * log(RecentGrowth + 1)
         *
         * - TotalFollowers provides the base popularity weight
         * - RecentGrowth is log-scaled to reduce dominance of very large values
         * - Adding 1 to avoid log(0) for users with no recent growth
         */
        const trendingScore = totalFollowers * Math.log(recentGrowth + 1);

        return {
          userId: item.userId,
          trendingScore,
        };
      });

      return scoredUsers
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit)
        .map((item) => item.userId);
    } catch (error) {
      this.logger.error(error, {
        context: 'PeopleDiscovery',
        location: 'getTrendingUserIds',
      });
      return [];
    }
  }

  private async getRandomActiveUsers(excludedUserIds: Set<string>): Promise<User['id'][]> {
    try {
      const client = this.supabaseService.getClient();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: activeUsers, error: activeError } = await client
        .from('posts')
        .select('user_id')
        .gte('last_modified', threeDaysAgo.toISOString())
        .not('user_id', 'in', `(${Array.from(excludedUserIds).join(',')})`)
        .order('last_modified', { ascending: false })
        .limit(50);

      if (activeError || activeUsers.length === 0) return [];

      const uniqueUserIds = Array.from(new Set(activeUsers.map((item) => item.user_id)));

      const shuffled = uniqueUserIds.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 2);
    } catch (error) {
      this.logger.error(error, {
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

      const users = await this.supabaseService.select<User>('users', {
        whereIn: { id: userIds },
        select: 'id, username, email, display_name, avatar, bio',
      });

      const currentUserFollowing = await this.supabaseService.select('follows', {
        select: 'following_id',
        where: { follower_id: currentUserId },
      });
      const followingIds = currentUserFollowing.map((f) => f.following_id);

      const userPayloads = await Promise.all(
        users.map(async (user) => {
          const [followers, following, mutualFollowersData] = await Promise.all([
            this.userService.getFollowerCount(user.id),
            this.userService.getFollowingCount(user.id),
            this.getMutualFollowers(user.id, followingIds, 3),
          ]);

          const { users: mutualFollowers, totalCount } = mutualFollowersData;
          const remainingCount = Math.max(0, totalCount - mutualFollowers.length);

          const followedBy =
            mutualFollowers.length > 0
              ? {
                  count: remainingCount,
                  displayItems: mutualFollowers.map((follower) => ({
                    id: follower.id,
                    displayName: follower.display_name || follower.username,
                    avatar: follower.avatar,
                  })),
                }
              : null;

          return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.display_name,
            avatar: user.avatar,
            bio: user.bio,
            followers,
            following,
            isFollowing: false,
            isMuted: false,
            hasStory: false, // TODO: Add story query
            followedBy,
          };
        })
      );

      return userPayloads;
    } catch (error) {
      this.logger.error(error, {
        context: 'PeopleDiscovery',
        location: 'parseToUserSummaryDto',
      });
      return [];
    }
  }

  private async getMutualFollowers(
    suggestedUserId: string,
    currentUserFollowingIds: string[],
    limit = 3
  ): Promise<{ users: User[]; totalCount: number }> {
    try {
      if (currentUserFollowingIds.length === 0) return { users: [], totalCount: 0 };

      // Get total count of mutual followers
      const totalMutualFollows = await this.supabaseService.select('follows', {
        select: 'follower_id',
        where: { following_id: suggestedUserId },
        whereIn: { follower_id: currentUserFollowingIds },
      });

      const totalCount = totalMutualFollows.length;
      if (totalCount === 0) return { users: [], totalCount: 0 };

      // Get limited number for display
      const mutualFollowsData = await this.supabaseService.select('follows', {
        select: 'follower_id',
        where: { following_id: suggestedUserId },
        whereIn: { follower_id: currentUserFollowingIds },
        limit,
      });

      const mutualFollowerIds = mutualFollowsData.map((f) => f.follower_id);

      const mutualFollowers = await this.supabaseService.select<User>('users', {
        whereIn: { id: mutualFollowerIds },
        select: 'id, username, display_name, avatar',
      });

      return { users: mutualFollowers, totalCount };
    } catch (error) {
      this.logger.error(error, {
        context: 'PeopleDiscovery',
        location: 'getMutualFollowers',
      });
      return { users: [], totalCount: 0 };
    }
  }
}
