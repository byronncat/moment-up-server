import type { User } from 'schema';
import type { JwtPayload } from 'jwt-library';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ErrorMessage, UserService } from './user.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import { FollowPaginationDto, ReportUserDto, UpdateProfileDto } from './dto';

@Controller({
  path: 'users',
  version: '1',
})
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':username')
  @HttpCode(HttpStatus.OK)
  async getProfileByUsername(
    @Param('username') username: User['username'],
    @AccessToken() token?: JwtPayload
  ) {
    const currentUserId = token?.sub ?? '';
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
    const currentUserId = token.sub ?? '';
    if (currentUserId !== userId)
      throw new BadRequestException(ErrorMessage.Profile.UpdateForbidden);

    const updatedUser = await this.userService.updateProfile(userId, updateData);
    if (!updatedUser) throw new NotFoundException(ErrorMessage.Profile.NotFound);

    return {
      user: updatedUser,
    };
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async followUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub ?? '';
    if (currentUserId === targetUserId)
      throw new BadRequestException(ErrorMessage.Follow.Conflict(true));

    return { follow: await this.userService.follow(currentUserId, targetUserId) };
  }

  @Delete(':id/unfollow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unfollowUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub ?? '';
    if (currentUserId === targetUserId)
      throw new BadRequestException(ErrorMessage.Follow.Conflict(false));

    await this.userService.unfollow(currentUserId, targetUserId);
  }

  @Patch(':id/follow-request/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async acceptFollowRequest(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub ?? '';
    return this.userService.acceptFollowRequest(currentUserId, targetUserId);
  }

  @Delete(':id/follow-request/decline')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async declineFollowRequest(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub ?? '';
    await this.userService.declineFollowRequest(currentUserId, targetUserId);
  }

  @Delete(':id/remove-follower')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async removeFollower(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub ?? '';
    if (currentUserId === targetUserId)
      throw new BadRequestException('You cannot remove yourself as a follower.');

    try {
      await this.userService.unfollow(targetUserId, currentUserId);
    } catch {
      throw new BadRequestException('Failed to remove this follower.');
    }
  }

  @Get(':id/followers')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getFollowers(
    @AccessToken() token: JwtPayload,
    @Param('id') userId: string,
    @Query(ValidationPipe) pagination: FollowPaginationDto
  ) {
    const currentUserId = token.sub ?? '';
    return this.userService.getFollowers(userId, pagination, currentUserId);
  }

  @Get(':id/following')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getFollowing(
    @AccessToken() token: JwtPayload,
    @Param('id') userId: string,
    @Query(ValidationPipe) pagination: FollowPaginationDto
  ) {
    const currentUserId = token.sub ?? '';
    return this.userService.getFollowing(userId, pagination, currentUserId);
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async blockUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub ?? '';
    if (currentUserId === targetUserId)
      throw new BadRequestException(ErrorMessage.Block.Conflict(true));

    return { block: await this.userService.block(currentUserId, targetUserId) };
  }

  @Delete(':id/unblock')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unblockUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub ?? '';
    if (currentUserId === targetUserId)
      throw new BadRequestException(ErrorMessage.Block.Conflict(false));

    await this.userService.unblock(currentUserId, targetUserId);
  }

  @Get(':id/blocked-users')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getBlockedUsers(@AccessToken() token: JwtPayload, @Param('id') userId: string) {
    const currentUserId = token.sub ?? '';
    if (currentUserId !== userId)
      throw new BadRequestException('You can only view your own blocked users');

    return {
      blockedUsers: await this.userService.getBlockedUsers(userId),
    };
  }

  @Post(':id/mute')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async muteUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub ?? '';
    return { mute: await this.userService.mute(currentUserId, targetUserId) };
  }

  @Delete(':id/unmute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unmuteUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub ?? '';
    await this.userService.unmute(currentUserId, targetUserId);
  }

  @Get(':id/muted-users')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getMutedUsers(@AccessToken() token: JwtPayload, @Param('id') userId: string) {
    const currentUserId = token.sub ?? '';
    if (currentUserId !== userId)
      throw new BadRequestException('You can only view your own muted users');

    return {
      mutedUsers: await this.userService.getMutedUsers(userId),
    };
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async reportUser(
    @Param('id') targetUserId: string,
    @Body(ValidationPipe) reportData: ReportUserDto
  ) {
    return { report: await this.userService.reportUser(targetUserId, reportData) };
  }
}
