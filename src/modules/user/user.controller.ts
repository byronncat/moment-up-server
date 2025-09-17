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
  Patch,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Inject,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import { UpdateProfileDto } from './dto';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Controller({
  path: 'users',
  version: '1',
})
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  @Get(':username')
  @HttpCode(HttpStatus.OK)
  async getProfileByUsername(
    @AccessToken() token: JwtPayload,
    @Param('username') username: User['username']
  ) {
    const currentUserId = token?.sub || '';
    const profile = await this.userService.getProfileByUsername(username, currentUserId);
    if (!profile) throw new NotFoundException('Profile not found');
    return {
      profile,
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async updateProfile(
    @AccessToken() token: JwtPayload,
    @Param('id') userId: string,
    @Body(ValidationPipe) updateData: UpdateProfileDto
  ) {
    const currentUserId = token?.sub || '';
    if (currentUserId !== userId)
      throw new BadRequestException('You can only update your own profile');

    const updatedUser = await this.userService.updateProfile(userId, updateData);
    if (!updatedUser) throw new NotFoundException('User not found');

    return {
      user: updatedUser,
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
    return {
      followers: await this.userService.getFollowers(userId),
    };
  }

  @Get(':id/followings')
  @HttpCode(HttpStatus.OK)
  async getFollowings(@Param('id') userId: string) {
    return {
      followings: await this.userService.getFollowings(userId),
    };
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async blockUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token?.sub || '';
    return { block: await this.userService.block(currentUserId, targetUserId) };
  }

  @Delete(':id/unblock')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unblockUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token?.sub || '';
    await this.userService.unblock(currentUserId, targetUserId);
  }

  @Get(':id/blocked-users')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getBlockedUsers(@AccessToken() token: JwtPayload, @Param('id') userId: string) {
    const currentUserId = token?.sub || '';
    if (currentUserId !== userId) {
      throw new BadRequestException('You can only view your own blocked users');
    }
    return {
      blockedUsers: await this.userService.getBlockedUsers(userId),
    };
  }

  @Post(':id/mute')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async muteUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token?.sub || '';
    return { mute: await this.userService.mute(currentUserId, targetUserId) };
  }

  @Delete(':id/unmute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unmuteUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token?.sub || '';
    await this.userService.unmute(currentUserId, targetUserId);
  }

  @Get(':id/muted-users')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getMutedUsers(@AccessToken() token: JwtPayload, @Param('id') userId: string) {
    const currentUserId = token?.sub || '';
    if (currentUserId !== userId) {
      throw new BadRequestException('You can only view your own muted users');
    }
    return {
      mutedUsers: await this.userService.getMutedUsers(userId),
    };
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async reportUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token?.sub || '';
    this.logger.silly(`User ${currentUserId} reported user ${targetUserId}`, {
      action: 'report_user',
      currentUserId,
      targetUserId,
    });
    return {
      success: true,
      message: 'User reported successfully',
    };
  }
}
