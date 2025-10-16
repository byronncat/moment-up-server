import type { Block, Follow, Mute, User, UserReport } from 'schema';
import type { AccountDto, PaginationDto, ProfileDto, UserSummaryDto } from 'api';
import type { GoogleUser } from 'passport-library';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { CloudinaryService } from '../database/cloudinary.service';
import { FollowPaginationDto, ReportUserDto, UpdateProfileDto } from './dto';
import { Auth, String } from 'src/common/helpers';
import {
  AccountExist,
  FollowStatus,
  INITIAL_PAGE,
  NotificationType,
  ProfileVisibility,
} from 'src/common/constants';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly supabaseService: SupabaseService,
    private readonly cloudinaryService: CloudinaryService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService
  ) {}

  public async search(query: string, page: number, limit: number) {
    try {
      const users = await this.supabaseService.select<User>('users', {
        select: 'id, username, display_name, avatar, user_stats(followers_count)',
        caseSensitive: false,
        orWhere: { username: `%${query}%`, display_name: `%${query}%` },
        limit: limit + 1,
        offset: (page - INITIAL_PAGE) * limit,
      });

      const hasNextPage = users.length > limit;
      if (hasNextPage) users.pop();

      const items = users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatar: u.avatar,
      }));

      return {
        page,
        limit,
        hasNextPage,
        items,
      } as PaginationDto<AccountDto>;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'searchUsers',
        context: 'UserService',
      });
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async getById(id: string, select?: string) {
    try {
      const isUuid = String.isUuid(id);
      const [user] = await this.supabaseService.select<User>('users', {
        select,
        caseSensitive: false,
        orWhere: isUuid ? { id } : { username: id, email: id },
      });

      return user;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getById',
        context: 'UserService',
      });
      return undefined;
    }
  }

  public async addCredentialUser(
    userData: Required<Pick<User, 'email' | 'username' | 'password'>>
  ) {
    try {
      const [newUser] = await this.supabaseService.insert<User>('users', {
        email: userData.email.toLocaleLowerCase(),
        username: userData.username.toLocaleLowerCase(),
        password: userData.password,
      });

      return newUser;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'addCredentialUser',
        context: 'UserService',
      });
      return undefined;
    }
  }

  public async addGoogleUser(googleData: GoogleUser) {
    try {
      const displayName =
        googleData.firstName && googleData.lastName
          ? `${googleData.firstName} ${googleData.lastName}`
          : googleData.email.split('@')[0];

      let username = Auth.generateUsername(googleData.email);
      while (await this.supabaseService.exists('users', { where: { username } })) {
        username = Auth.generateUsername(googleData.email);
      }

      const [newUser] = await this.supabaseService.insert<User>('users', {
        username,
        display_name: displayName,
        email: googleData.email,
        blocked: false,
        verified: true,
      });

      return newUser;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'addGoogleUser',
        context: 'UserService',
      });
      return undefined;
    }
  }

  public async isAccountExist(email: string, username: string) {
    try {
      const [user] = await this.supabaseService.select<User>('users', {
        select: 'email, username',
        caseSensitive: false,
        orWhere: { email, username },
      });

      if (email.toLowerCase() === user.email) return AccountExist.EMAIL;
      if (username.toLowerCase() === user.username) return AccountExist.USERNAME;
      return AccountExist.NONE;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'isAccountExist',
        context: 'UserService',
      });
      return AccountExist.NONE;
    }
  }

  public async getUserSummaries(userIds: string[], currentUserId?: string) {
    try {
      if (userIds.length === 0) return [];

      const { data, error } = await this.supabaseService.getClient().rpc('get_user_summary_batch', {
        p_user_ids: userIds,
        ...(currentUserId ? { p_current_user_id: currentUserId } : {}),
        p_mutual_limit: 3,
      });
      if (error) throw error;
      if (!data) throw new Error('Failed to get user summaries.');
      const userSummaries: UserSummaryDto[] = data.map((user: any) => {
        return {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatar: user.avatar,
          bio: user.bio,
          followers: user.followers,
          following: user.following,
          isFollowing: user.is_following,
          hasStory: user.has_story,
          followedBy: user.followed_by,
        } satisfies UserSummaryDto;
      });
      return userSummaries;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getUserSummariesBatch',
        context: 'UserService',
      });
      return undefined;
    }
  }

  public async getProfileByUsername(username: string, currentUserId?: string) {
    try {
      const { data, error } = await this.supabaseService.getClient().rpc('get_user_profile', {
        p_username: username,
        ...(currentUserId ? { p_current_user_id: currentUserId } : {}),
      });
      if (error) throw error;

      const profile = data[0];
      if (!profile) throw new Error('User not found.');
      if (profile.is_blocked) return undefined;

      return {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatar: profile.avatar,
        backgroundImage: profile.background_image,
        bio: profile.bio,
        followers: profile.followers,
        following: profile.following,
        isFollower: profile.is_follower,
        isFollowing: profile.is_following,
        isFollowRequest: profile.is_follow_request,
        isMuted: profile.is_muted,
        isProtected: profile.is_protected,
        hasStory: profile.has_story,
      } satisfies ProfileDto;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getProfileByUsername',
        context: 'UserService',
      });
      return undefined;
    }
  }

  public async updatePassword(userId: string, hashedPassword: string) {
    try {
      await this.supabaseService.update<User>(
        'users',
        { password: hashedPassword },
        { id: userId }
      );

      return true;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'updatePassword',
        context: 'UserService',
      });
      return false;
    }
  }

  public async verifyEmail(email: string) {
    try {
      const [user] = await this.supabaseService.update<User>(
        'users',
        { verified: true },
        { email }
      );

      return user;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'verifyEmail',
        context: 'UserService',
      });
      return undefined;
    }
  }

  public async updateProfile(
    userId: string,
    { avatar, backgroundImage, displayName, bio }: UpdateProfileDto
  ) {
    try {
      const currentUser = await this.getById(userId, 'id, avatar, background_image');
      if (!currentUser) return undefined;

      const deletedImages = [];
      const updateFields: Partial<User> = {};
      if (avatar !== undefined) {
        if (currentUser.avatar) deletedImages.push(currentUser.avatar);
        updateFields.avatar = avatar;
      }

      if (backgroundImage !== undefined) {
        if (currentUser.background_image) deletedImages.push(currentUser.background_image);
        updateFields.background_image = backgroundImage;
      }

      if (displayName !== undefined) updateFields.display_name = displayName;
      if (bio !== undefined) updateFields.bio = bio;

      const [profile] = await this.supabaseService.update<User>('users', updateFields, {
        id: userId,
      });

      if (deletedImages.length > 0) {
        await Promise.all(deletedImages.map((image) => this.deleteOldImage(image)));
      }

      return profile;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'updateProfile',
        context: 'UserService',
      });
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async follow(currentUserId: User['id'], targetUserId: User['id']) {
    try {
      const targetUser = await this.getById(targetUserId, 'id, privacy');
      if (!targetUser) throw new NotFoundException('Target user not found.');

      const isPrivate = targetUser.privacy === ProfileVisibility.PRIVATE;
      const followStatus = isPrivate ? FollowStatus.PENDING : FollowStatus.ACCEPTED;

      const [newFollow] = await this.supabaseService.insert<Follow>('follows', {
        follower_id: currentUserId,
        following_id: targetUserId,
        status: followStatus,
      });

      if (followStatus === FollowStatus.ACCEPTED) {
        await this.updateUserStats(targetUserId, 'followers_count', 1);
        await this.updateUserStats(currentUserId, 'following_count', 1);
      } else {
        await this.notificationService.notify(NotificationType.FOLLOW_REQUEST, {
          userId: targetUserId,
          actorId: currentUserId,
          entityId: null,
        });
      }

      return newFollow;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'follow',
        context: 'UserService',
      });
      if (error instanceof NotFoundException) throw error;
      if (error.message.includes('duplicate key value violates unique constraint "follows_pkey"'))
        throw new ConflictException('You are already following this user.');
      throw new BadRequestException('Unable to follow user.');
    }
  }

  public async unfollow(currentUserId: string, targetUserId: string) {
    try {
      const follows = await this.supabaseService.delete<Follow>('follows', {
        follower_id: currentUserId,
        following_id: targetUserId,
      });
      if (follows.length === 0) throw new ConflictException('You are not following this user.');

      if (follows[0].status === FollowStatus.ACCEPTED) {
        await this.updateUserStats(targetUserId, 'followers_count', -1);
        await this.updateUserStats(currentUserId, 'following_count', -1);
      } else {
        await this.notificationService.removeFollowRequest(currentUserId, targetUserId);
      }
    } catch (error) {
      this.logger.error(error.message, {
        location: 'unfollow',
        context: 'UserService',
      });
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException('Unable to unfollow user.');
    }
  }

  public async acceptFollowRequest(currentUserId: string, targetUserId: string) {
    try {
      const updatedFollows = await this.supabaseService.update<Follow>(
        'follows',
        {
          status: FollowStatus.ACCEPTED,
        },
        {
          follower_id: targetUserId,
          following_id: currentUserId,
        }
      );

      if (updatedFollows.length === 0)
        throw new ConflictException("You are not waiting for this user's follow request.");

      await this.updateUserStats(targetUserId, 'following_count', 1);
      await this.updateUserStats(currentUserId, 'followers_count', 1);

      await this.notificationService.removeFollowRequest(currentUserId, targetUserId);
      return updatedFollows[0];
    } catch (error) {
      this.logger.error(error.message, {
        location: 'acceptFollowRequest',
        context: 'UserService',
      });
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException('Unable to accept follow request.');
    }
  }

  public async declineFollowRequest(currentUserId: string, targetUserId: string) {
    try {
      const deletedFollows = await this.supabaseService.delete<Follow>('follows', {
        follower_id: targetUserId,
        following_id: currentUserId,
      });

      if (deletedFollows.length === 0)
        throw new ConflictException("You are not waiting for this user's follow request.");

      this.notificationService.removeFollowRequest(currentUserId, targetUserId);
      return deletedFollows[0];
    } catch (error) {
      this.logger.error(error.message, {
        location: 'declineFollowRequest',
        context: 'UserService',
      });
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException('Unable to decline follow request.');
    }
  }

  public async getFollowers(
    { userId, currentUserId }: { userId: string; currentUserId: string },
    { limit, page }: FollowPaginationDto
  ): Promise<PaginationDto<UserSummaryDto>> {
    try {
      const followers = await this.supabaseService.select<Follow>('follows', {
        select: 'follower_id',
        where: { following_id: userId, status: FollowStatus.ACCEPTED },
        limit: limit + 1,
        offset: (page - INITIAL_PAGE) * limit,
        orderBy: { column: 'created_at', ascending: false },
      });

      const hasNextPage = followers.length > limit;
      if (hasNextPage) followers.pop();

      const followerIds = followers.map((f) => f.follower_id);
      if (followerIds.length === 0)
        return {
          page,
          limit,
          hasNextPage: false,
          items: [],
        };

      const userSummaries = await this.getUserSummaries(followerIds, currentUserId);
      if (!userSummaries) throw new Error('Failed to get followers.');
      return {
        page,
        limit,
        hasNextPage,
        items: userSummaries,
      };
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getFollowers',
        context: 'UserService',
      });
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async getFollowing(
    { userId, currentUserId }: { userId: string; currentUserId: string },
    { limit, page }: FollowPaginationDto
  ): Promise<PaginationDto<UserSummaryDto>> {
    try {
      const following = await this.supabaseService.select<Follow>('follows', {
        select: 'following_id',
        where: { follower_id: userId, status: FollowStatus.ACCEPTED },
        limit: limit + 1,
        offset: (page - INITIAL_PAGE) * limit,
        orderBy: { column: 'created_at', ascending: false },
      });

      const hasNextPage = following.length > limit;
      if (hasNextPage) following.pop();

      const followingIds = following.map((f) => f.following_id);
      if (followingIds.length === 0)
        return {
          page,
          limit,
          hasNextPage: false,
          items: [],
        };

      const userSummaries = await this.getUserSummaries(followingIds, currentUserId);
      if (!userSummaries) throw new Error('Failed to get following.');
      return {
        page,
        limit,
        hasNextPage,
        items: userSummaries,
      };
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getFollowing',
        context: 'UserService',
      });
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async block(currentUserId: User['id'], targetUserId: User['id']) {
    try {
      const { data: existingFollows, error } = await this.supabaseService
        .getClient()
        .from('follows')
        .delete()
        .or(
          `and(follower_id.eq.${currentUserId},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${currentUserId})`
        )
        .select('following_id, follower_id');

      if (error) throw error;
      if (existingFollows.length > 0) {
        await this.updateUserStats(existingFollows[0].follower_id, 'following_count', -1);
        await this.updateUserStats(existingFollows[0].following_id, 'followers_count', -1);
      }

      const [newBlock] = await this.supabaseService.insert<Block>('blocks', {
        blocker_id: currentUserId,
        blocked_id: targetUserId,
      });

      return newBlock;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'block',
        context: 'UserService',
      });
      if (error.message.includes('duplicate key value violates unique constraint "blocks_pkey"'))
        throw new ConflictException('You are already blocking this user.');
      if (error.message.includes('foreign key constraint "blocks_blocked_id_fkey"'))
        throw new NotFoundException('Target user not found.');
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async unblock(currentUserId: string, targetUserId: string) {
    try {
      const deletedBlocks = await this.supabaseService.delete<Block>('blocks', {
        blocker_id: currentUserId,
        blocked_id: targetUserId,
      });

      if (deletedBlocks.length === 0)
        throw new ConflictException('You are not blocking this user.');
    } catch (error) {
      this.logger.error(error.message, {
        location: 'unblock',
        context: 'UserService',
      });
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async getBlockedUsers(userId: User['id'], limit = 10, offset = 0): Promise<User[]> {
    try {
      const blocks = await this.supabaseService.select<Block>('blocks', {
        where: { blocker_id: userId },
        limit,
        offset,
        orderBy: { column: 'created_at', ascending: false },
      });

      const blockedUserIds = blocks.map((block) => block.blocked_id);
      if (blockedUserIds.length === 0) return [];

      return await this.supabaseService.select<User>('users', {
        whereIn: { id: blockedUserIds },
        select: 'id, username, display_name, avatar',
      });
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getBlockedUsers',
        context: 'UserService',
      });
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async mute(currentUserId: string, targetUserId: string) {
    try {
      const newMutes = await this.supabaseService.insert<Mute>('mutes', {
        muter_id: currentUserId,
        muted_id: targetUserId,
      });

      if (newMutes.length === 0) throw new ConflictException('You are already muting this user.');
      return newMutes[0];
    } catch (error) {
      this.logger.error(error.message, {
        location: 'mute',
        context: 'UserService',
      });
      if (error instanceof ConflictException) throw error;
      if (error.message.includes('foreign key constraint "mutes_muted_id_fkey"'))
        throw new NotFoundException('Target user not found.');
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async unmute(currentUserId: User['id'], targetUserId: User['id']) {
    try {
      const deletedMutes = await this.supabaseService.delete<Mute>('mutes', {
        muter_id: currentUserId,
        muted_id: targetUserId,
      });

      if (deletedMutes.length === 0) throw new ConflictException('You are not muting this user.');
    } catch (error) {
      this.logger.error(error.message, {
        location: 'unmute',
        context: 'UserService',
      });
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async getMutedUsers(userId: User['id'], limit = 10, offset = 0): Promise<User[]> {
    try {
      const mutes = await this.supabaseService.select<Mute>('mutes', {
        where: { muter_id: userId },
        limit,
        offset,
        orderBy: { column: 'created_at', ascending: false },
      });

      const mutedUserIds = mutes.map((mute) => mute.muted_id);
      if (mutedUserIds.length === 0) return [];

      return await this.supabaseService.select<User>('users', {
        whereIn: { id: mutedUserIds },
        select: 'id, username, display_name, avatar',
      });
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getMutedUsers',
        context: 'UserService',
      });
      throw new BadRequestException('Something went wrong.');
    }
  }

  public async reportUser(
    { userId, currentUserId }: { userId: string; currentUserId: string },
    { type }: ReportUserDto
  ) {
    try {
      const [newReport] = await this.supabaseService.insert<UserReport>('user_reports', {
        user_id: userId,
        reporter_id: currentUserId,
        type,
      });

      return newReport;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'reportUser',
        context: 'UserService',
      });
      if (error.message.includes('violates foreign key constraint "user_reports_user_id_fkey"'))
        throw new NotFoundException('Target user not found.');
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async getExcludedUserIds(userId: string): Promise<Set<string>> {
    try {
      const { data, error } = await this.supabaseService.getClient().rpc('get_excluded_user_ids', {
        user_uuid: userId,
      });
      if (error) throw error;

      const excludedUserIds = new Set<string>(
        data.map((record: { excluded_id: string }) => record.excluded_id)
      ).add(userId);
      return excludedUserIds;
    } catch (error: any) {
      this.logger.error(error.message, {
        location: 'getExcludedUserIds',
        context: 'PeopleDiscovery',
      });
      return new Set([userId]);
    }
  }

  public async updateUserStats(userId: User['id'], field: string, increment: number) {
    try {
      const { error } = await this.supabaseService.getClient().rpc('increment_user_stat', {
        p_user_id: userId,
        p_field: field,
        p_increment: increment,
      });

      if (error) throw error;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'updateUserStats',
        context: 'UserService',
      });
    }
  }

  private async deleteOldImage(publicId: string): Promise<void> {
    try {
      // TEMPORARY
      const isHttp = publicId.startsWith('http');
      if (isHttp) return;
      // TEMPORARY

      await this.cloudinaryService.destroy(publicId);
    } catch (error) {
      this.logger.error(error.message, {
        context: 'UserService',
        location: 'deleteOldImage',
      });
    }
  }
}
