import type { UserDto, PopularProfilePayload } from 'api';
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

  public async getUser(userId: string): Promise<UserDto[]> {
    try {
      const suggestions = await this.getUserSuggestions(userId);
      return suggestions;
    } catch (error) {
      this.logger.error('Error getting user suggestions:', error);
      return [];
    }
  }

  public async getPopular(userId: string): Promise<PopularProfilePayload[]> {
    try {
      const trendingUserIds = await this.getTrendingUserIds(userId, 4);
      if (trendingUserIds.length === 0) return [];

      const users = await this.supabaseService.select<User>('users', {
        whereIn: { id: trendingUserIds },
        select: 'id, username, display_name, avatar, bio',
      });

      return users.map((user) => ({
        id: user.id,
        email: '',
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar,
        bio: user.bio,
        backgroundImage: undefined,
      }));
    } catch (error) {
      this.logger.error('Error getting popular profiles:', error);
      return [];
    }
  }

  private async getUserSuggestions(userId: string): Promise<UserDto[]> {
    const userIds: User['id'][] = [];

    const excludedUserIds = new Set([userId]);
    const followingData = await this.supabaseService.select('follows', {
      select: 'following_id',
      where: { follower_id: userId },
    });
    followingData?.forEach((f) => excludedUserIds.add(f.following_id));

    // 1. Mutual connections (followed by people you follow)
    const mutualConnections = await this.getMutualConnections(userId, excludedUserIds);
    userIds.push(...mutualConnections);
    mutualConnections.forEach((userId) => excludedUserIds.add(userId));
    console.log('mutualConnections', mutualConnections);

    // 2. Interests / hashtags (users who post about similar topics)
    if (userIds.length < 5) {
      const interestBasedUsers = await this.getInterestBasedUsers(userId, excludedUserIds);
      userIds.push(...interestBasedUsers);
      interestBasedUsers.forEach((userId) => excludedUserIds.add(userId));
      console.log('interestBasedUsers', interestBasedUsers);
    }

    // 3. Trending users (people gaining many followers quickly)
    if (userIds.length < 5) {
      const trendingUsers = await this.getTrendingUserIds(userId, 10, excludedUserIds);
      userIds.push(...trendingUsers);
      trendingUsers.forEach((userId) => excludedUserIds.add(userId));
      console.log('trendingUsers', trendingUsers);
    }

    // 4. Random but active users when no strong signals exist
    if (userIds.length < 5) {
      const activeUserIds = await this.getRandomActiveUsers(excludedUserIds);
      userIds.push(...activeUserIds);
      console.log('activeUserIds', activeUserIds);
    }

    console.log('activeUserIds', userIds);

    const suggestions = userIds.sort(() => Math.random() - 0.5).slice(0, 5);
    return await this.parseToUserDto(suggestions);
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
      this.logger.error('Error getting mutual connections:', error);
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
        .order('created_at', { ascending: false })
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
      this.logger.error('Error getting interest-based users:', error);
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
        .gte('created_at', sevenDaysAgo.toISOString())
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
      this.logger.error('Error getting trending user IDs:', error);
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
        .gte('created_at', threeDaysAgo.toISOString())
        .not('user_id', 'in', `(${Array.from(excludedUserIds).join(',')})`)
        .order('created_at', { ascending: false })
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

  private async parseToUserDto(userIds: string[]): Promise<UserDto[]> {
    try {
      if (userIds.length === 0) return [];

      const users = await this.supabaseService.select<User>('users', {
        whereIn: { id: userIds },
        select: 'id, username, email, display_name, avatar, bio',
      });

      const userPayloads = await Promise.all(
        users.map(async (user) => {
          const [followers, following, followersList] = await Promise.all([
            this.userService.getFollowerCount(user.id),
            this.userService.getFollowingCount(user.id),
            this.userService.getFollowers(user.id, 3),
          ]);

          return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.display_name,
            avatar: user.avatar,
            bio: user.bio,
            followers,
            following,
            hasStory: false, // TODO: Add story query
            followedBy: {
              count: followers,
              displayItems: followersList.map((follower) => ({
                id: follower.id,
                displayName: follower.display_name || follower.username,
                avatar: follower.avatar,
              })),
            },
          };
        })
      );

      return userPayloads;
    } catch (error) {
      this.logger.error(error, {
        context: 'PeopleDiscovery',
        location: 'parseToUserDto',
      });
      return [];
    }
  }
}
