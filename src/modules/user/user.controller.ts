import type { JwtPayload } from 'library';

import { Controller, Delete, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';

@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(AccessTokenGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post(':id/follow')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async followUser(@AccessToken() accessToken: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = accessToken.sub;
    return await this.userService.follow(currentUserId, targetUserId);
  }

  @Delete(':id/unfollow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unfollowUser(@AccessToken() accessToken: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = accessToken.sub;
    await this.userService.unfollow(currentUserId, targetUserId);
  }
}
