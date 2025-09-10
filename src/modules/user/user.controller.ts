import type { User } from 'schema';
import type { JwtPayload } from 'library';

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';

@Controller({
  path: 'users',
  version: '1',
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':username')
  @HttpCode(HttpStatus.OK)
  async getProfileByUsername(@Param('username') username: User['username']) {
    const profile = await this.userService.getProfileByUsername(username);
    if (!profile) throw new NotFoundException('Profile not found');
    return {
      profile,
    };
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async followUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token?.sub || '';
    return { follow: await this.userService.follow(currentUserId, targetUserId) };
  }

  @Delete(':id/unfollow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unfollowUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token?.sub || '';
    await this.userService.unfollow(currentUserId, targetUserId);
  }

  @Get(':id/followers')
  @HttpCode(HttpStatus.OK)
  async getFollowers(@Param('id') userId: string) {
    const followers = await this.userService.getFollowers(userId);
    return {
      followers,
    };
  }

  @Get(':id/following')
  @HttpCode(HttpStatus.OK)
  async getFollowing(@Param('id') userId: string) {
    const following = await this.userService.getFollowing(userId);
    return {
      following,
    };
  }

  @Get(':id/follow-status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getFollowStatus(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token?.sub || '';
    const [isFollowing, followerCount, followingCount] = await Promise.all([
      this.userService.isFollowing(currentUserId, targetUserId),
      this.userService.getFollowerCount(targetUserId),
      this.userService.getFollowingCount(targetUserId),
    ]);

    return {
      isFollowing,
      followerCount,
      followingCount,
    };
  }
}
