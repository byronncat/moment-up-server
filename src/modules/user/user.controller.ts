import type { JwtPayload } from 'jwt-library';

import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
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
import { UserService } from './user.service';
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
    @Param('username') username: string,
    @AccessToken() token?: JwtPayload
  ) {
    const currentUserId = token?.sub;
    const profile = await this.userService.getProfileByUsername(username, currentUserId);
    if (!profile) throw new NotFoundException('User not found.');

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
    const currentUserId = token.sub;
    if (currentUserId !== userId)
      throw new ForbiddenException("You are not allowed to update another user\'s profile.");

    const updatedProfile = await this.userService.updateProfile(userId, updateData);
    if (!updatedProfile) throw new NotFoundException('User not found.');

    return {
      profile: updatedProfile,
    };
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async followUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub;
    if (currentUserId === targetUserId)
      throw new BadRequestException('You cannot follow yourself.');

    return { follow: await this.userService.follow(currentUserId!, targetUserId) };
  }

  @Delete(':id/unfollow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unfollowUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub;
    if (currentUserId === targetUserId)
      throw new BadRequestException('You cannot unfollow yourself.');

    await this.userService.unfollow(currentUserId!, targetUserId);
  }

  @Patch(':id/follow-request/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async acceptFollowRequest(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub;
    return this.userService.acceptFollowRequest(currentUserId!, targetUserId);
  }

  @Delete(':id/follow-request/decline')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async declineFollowRequest(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub;
    await this.userService.declineFollowRequest(currentUserId!, targetUserId);
  }

  @Delete(':id/remove-follower')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async removeFollower(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub;
    if (currentUserId === targetUserId)
      throw new BadRequestException('You cannot remove yourself as a follower.');

    try {
      await this.userService.unfollow(targetUserId, currentUserId!);
    } catch (error) {
      if (error instanceof ConflictException)
        throw new ConflictException('This user is not your follower.');
      throw new BadRequestException('Unable to remove this follower.');
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
    const currentUserId = token.sub;
    return this.userService.getFollowers(
      {
        userId,
        currentUserId: currentUserId!,
      },
      pagination
    );
  }

  @Get(':id/following')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getFollowing(
    @AccessToken() token: JwtPayload,
    @Param('id') userId: string,
    @Query(ValidationPipe) pagination: FollowPaginationDto
  ) {
    const currentUserId = token.sub;
    return this.userService.getFollowing(
      {
        userId,
        currentUserId: currentUserId!,
      },
      pagination
    );
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async blockUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub;
    if (currentUserId === targetUserId) throw new BadRequestException('You cannot block yourself.');

    return { block: await this.userService.block(currentUserId!, targetUserId) };
  }

  @Delete(':id/unblock')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unblockUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub;
    if (currentUserId === targetUserId)
      throw new BadRequestException('You cannot unblock yourself.');

    await this.userService.unblock(currentUserId!, targetUserId);
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
    const currentUserId = token.sub;
    if (currentUserId === targetUserId) throw new BadRequestException('You cannot mute yourself.');
    return { mute: await this.userService.mute(currentUserId!, targetUserId) };
  }

  @Delete(':id/unmute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unmuteUser(@AccessToken() token: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = token.sub;
    if (currentUserId === targetUserId)
      throw new BadRequestException('You cannot unmute yourself.');
    await this.userService.unmute(currentUserId!, targetUserId);
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
    @AccessToken() token: JwtPayload,
    @Param('id') userId: string,
    @Body(ValidationPipe) reportData: ReportUserDto
  ) {
    const currentUserId = token.sub;
    if (currentUserId === userId) throw new BadRequestException('You cannot report yourself.');

    return {
      report: await this.userService.reportUser(
        { userId, currentUserId: currentUserId! },
        reportData
      ),
    };
  }
}
