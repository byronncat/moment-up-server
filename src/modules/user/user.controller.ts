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
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.CREATED)
  async followUser(@AccessToken() accessToken: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = accessToken.sub;
    await this.userService.follow(currentUserId, targetUserId);
    return;
  }

  @Delete(':id/unfollow')
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollowUser(@AccessToken() accessToken: JwtPayload, @Param('id') targetUserId: string) {
    const currentUserId = accessToken.sub;
    await this.userService.unfollow(currentUserId, targetUserId);
    return;
  }
}
