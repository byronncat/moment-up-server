import type { Block, Follow, Mute, User, UserReport } from 'schema';
import type { ProfileDto, UserSummaryDto } from 'api';
import type { GoogleUser } from 'passport-library';

type UniqueUserId = User['id'] | User['email'] | User['username'];

import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { type SelectOptions, SupabaseService } from '../database/supabase.service';
import { CloudinaryService } from '../database/cloudinary.service';
import { ReportUserDto, UpdateProfileDto } from './dto';
import { Auth, String } from 'src/common/helpers';
import { AccountExist } from 'src/common/constants';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

export const ErrorMessage = {
  Profile: {
    NotFound: 'User not found',
    UpdateForbidden: 'You can only update your own profile.',
  },
  Follow: {
    Conflict: (follow: boolean) => `You cannot ${follow ? 'follow' : 'unfollow'} yourself`,
    Failed: (follow: boolean) => `Failed to ${follow ? 'follow' : 'unfollow'} user`,
    Get: (follow: boolean) => `Failed to get ${follow ? 'followers' : 'following'}`,
  },
  Block: {
    Conflict: (block: boolean) => `You cannot ${block ? 'block' : 'unblock'} yourself`,
    Failed: (block: boolean) => `Failed to ${block ? 'block' : 'unblock'} user`,
  },
  Mute: {
    Conflict: (mute: boolean) => `You cannot ${mute ? 'mute' : 'unmute'} yourself`,
    Failed: (mute: boolean) => `Failed to ${mute ? 'mute' : 'unmute'} user`,
  },
  Report: {
    Failed: 'Failed to report this user. Please try again later.',
  },
  InternalServerError: 'Something went wrong. Please try again.',
};

@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly supabaseService: SupabaseService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  public async getById(id: UniqueUserId, options?: Pick<SelectOptions, 'select'>) {
    try {
      const isUuid = String.isUuid(id);
      const [user] = await this.supabaseService.select<User>('users', {
        select: options?.select,
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
      return null;
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

  public async isAccountExist(email: UniqueUserId, username: UniqueUserId) {
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

  public async getUserSummaries(userIds: Array<User['id']>, currentUserId?: User['id']) {
    try {
      if (userIds.length === 0) return [];

      const { data, error } = await this.supabaseService.getClient().rpc('get_user_summary_batch', {
        p_user_ids: userIds,
        p_current_user_id: currentUserId ?? null,
        p_mutual_limit: 3,
      });
      if (error) throw error;

      if (!data) throw new Error('Failed to get user summaries');
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

  public async getProfileByUsername(username: User['username'], currentUserId?: User['id']) {
    try {
      const { data, error } = await this.supabaseService.getClient().rpc('get_user_profile', {
        p_username: username,
        p_current_user_id: currentUserId ?? null,
      });
      if (error) throw error;

      const profile = data[0];
      if (!profile) throw new Error('User not found');
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
        isMuted: profile.is_muted,
        isProtected: profile.is_protected,
        hasStory: profile.has_story,
      } as ProfileDto;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getProfileByUsername',
        context: 'UserService',
      });
      return undefined;
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
    } catch (error) {
      this.logger.error(error.message, {
        location: 'updatePassword',
        context: 'UserService',
      });
      return false;
    }
  }

  public async verifyEmail(userId: User['id']) {
    try {
      const [user] = await this.supabaseService.update<User>(
        'users',
        { verified: true },
        { id: userId }
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

  public async updateProfile(userId: User['id'], updateData: UpdateProfileDto) {
    try {
      const currentUser = await this.getById(userId, {
        select: 'id, avatar, background_image',
      });
      if (!currentUser) return undefined;

      const updateFields: Partial<User> = {};
      if (updateData.avatar !== undefined) {
        if (currentUser.avatar) await this.deleteOldImage(currentUser.avatar);
        updateFields.avatar = updateData.avatar;
      }

      if (updateData.backgroundImage !== undefined) {
        if (currentUser.background_image) await this.deleteOldImage(currentUser.background_image);
        updateFields.background_image = updateData.backgroundImage;
      }

      if (updateData.displayName !== undefined) updateFields.display_name = updateData.displayName;
      if (updateData.bio !== undefined) updateFields.bio = updateData.bio;

      const [user] = await this.supabaseService.update<User>('users', updateFields, { id: userId });
      return user;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'updateProfile',
        context: 'UserService',
      });
      throw new InternalServerErrorException(ErrorMessage.InternalServerError);
    }
  }

  public async follow(currentUserId: User['id'], targetUserId: User['id']) {
    try {
      const [newFollow] = await this.supabaseService.insert<Follow>('follows', {
        follower_id: currentUserId,
        following_id: targetUserId,
      });

      return newFollow;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'follow',
        context: 'UserService',
      });
      throw new BadRequestException(ErrorMessage.Follow.Failed(true));
    }
  }

  public async unfollow(currentUserId: User['id'], targetUserId: User['id']) {
    try {
      await this.supabaseService.delete<Follow>('follows', {
        follower_id: currentUserId,
        following_id: targetUserId,
      });
    } catch (error) {
      this.logger.error(error.message, {
        location: 'unfollow',
        context: 'UserService',
      });
      throw new BadRequestException(ErrorMessage.Follow.Failed(false));
    }
  }

  public async getFollowers(
    userId: User['id'],
    limit = 10,
    offset = 0,
    currentUserId?: User['id']
  ): Promise<UserSummaryDto[]> {
    try {
      // First, get the follower IDs
      const followers = await this.supabaseService.select<{ follower_id: string }>('follows', {
        select: 'follower_id',
        where: { following_id: userId },
        limit,
        offset,
        orderBy: { column: 'created_at', ascending: false },
      });

      if (followers.length === 0) return [];

      // Extract the user IDs
      const followerIds = followers.map((f) => f.follower_id);

      // Use getUserSummaries to get complete user data
      const userSummaries = await this.getUserSummaries(followerIds, currentUserId);

      return userSummaries ?? [];
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getFollowers',
        context: 'UserService',
      });
      throw new InternalServerErrorException(ErrorMessage.InternalServerError);
    }
  }

  public async getFollowing(
    userId: User['id'],
    limit = 10,
    offset = 0,
    currentUserId?: User['id']
  ): Promise<UserSummaryDto[]> {
    try {
      const following = await this.supabaseService.select<Follow>('follows', {
        select: 'following_id',
        where: { follower_id: userId },
        limit,
        offset,
        orderBy: { column: 'created_at', ascending: false },
      });

      const followingIds = following.map((f) => f.following_id);
      const userSummaries = await this.getUserSummaries(followingIds, currentUserId);
      if (!userSummaries) throw new Error('Failed to get following');
      return userSummaries;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getFollowing',
        context: 'UserService',
      });
      throw new BadRequestException(ErrorMessage.Follow.Get(true));
    }
  }

  public async block(currentUserId: User['id'], targetUserId: User['id']) {
    try {
      await this.supabaseService
        .getClient()
        .from('follows')
        .delete()
        .or(
          `and(follower_id.eq.${currentUserId},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${currentUserId})`
        );

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
      throw new BadRequestException(ErrorMessage.Block.Failed(true));
    }
  }

  public async unblock(currentUserId: User['id'], targetUserId: User['id']) {
    try {
      await this.supabaseService.delete<Block>('blocks', {
        blocker_id: currentUserId,
        blocked_id: targetUserId,
      });
    } catch (error) {
      this.logger.error(error.message, {
        location: 'unblock',
        context: 'UserService',
      });
      throw new BadRequestException(ErrorMessage.Block.Failed(false));
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
      throw new BadRequestException(ErrorMessage.Mute.Failed(true));
    }
  }

  public async mute(currentUserId: User['id'], targetUserId: User['id']) {
    try {
      if (currentUserId === targetUserId)
        throw new BadRequestException(ErrorMessage.Mute.Conflict(true));

      const [newMute] = await this.supabaseService.insert<Mute>('mutes', {
        muter_id: currentUserId,
        muted_id: targetUserId,
      });

      return newMute;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'mute',
        context: 'UserService',
      });
      throw new BadRequestException(ErrorMessage.Mute.Failed(true));
    }
  }

  public async unmute(currentUserId: User['id'], targetUserId: User['id']) {
    try {
      if (currentUserId === targetUserId)
        throw new BadRequestException(ErrorMessage.Mute.Conflict(false));

      await this.supabaseService.delete<Mute>('mutes', {
        muter_id: currentUserId,
        muted_id: targetUserId,
      });
    } catch (error) {
      this.logger.error(error.message, {
        location: 'unmute',
        context: 'UserService',
      });
      throw new BadRequestException(ErrorMessage.Mute.Failed(false));
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
      throw new BadRequestException(ErrorMessage.Mute.Failed(false));
    }
  }

  public async reportUser(userId: User['id'], { type }: ReportUserDto) {
    try {
      const [newReport] = await this.supabaseService.insert<UserReport>('user_reports', {
        user_id: userId,
        type,
      });

      return newReport;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'reportUser',
        context: 'UserService',
      });
      throw new InternalServerErrorException(ErrorMessage.Report.Failed);
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
