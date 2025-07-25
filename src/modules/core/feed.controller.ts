import type { JwtPayload } from 'library';

import { Controller, HttpCode, HttpStatus, Get, UseGuards } from '@nestjs/common';
import { FeedService } from './feed.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';

@Controller({
  path: 'feeds',
  version: '1',
})
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getFeeds(@AccessToken() accessToken: JwtPayload) {
    const { sub: userId } = accessToken;
    return {
      feeds: await this.feedService.getFeeds(userId),
    };
  }
}
