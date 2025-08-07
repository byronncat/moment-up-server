import type { JwtPayload } from 'library';

import { Controller, HttpCode, HttpStatus, Get, UseGuards, Param } from '@nestjs/common';
import { FeedService } from './feed.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import { IdParamDto } from 'src/common/validators';

@Controller({
  path: 'feeds',
  version: '1',
})
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getFeeds(@AccessToken() { sub: userId }: JwtPayload) {
    return {
      feeds: await this.feedService.getFeeds(userId),
    };
  }

  @Get('user/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getFeed(@Param() { id: userId }: IdParamDto) {
    return {
      feed: await this.feedService.getFeed(userId),
    };
  }
}
