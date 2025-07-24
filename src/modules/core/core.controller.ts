import { Controller, HttpCode, HttpStatus, Get, Query, UseGuards } from '@nestjs/common';
import { MomentService } from './moment.service';
import { FeedService } from './feed.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import { JwtPayload } from 'library';
import { PaginationDto } from './dto/intdex';

@Controller({
  version: '1',
})
export class CoreController {
  constructor(
    private readonly momentService: MomentService,
    private readonly feedService: FeedService
  ) {}

  @Get('moments')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getMoments(@AccessToken() accessToken: JwtPayload, @Query() paginationDto: PaginationDto) {
    const { sub: userId } = accessToken;
    return await this.momentService.getMoments(userId, paginationDto);
  }

  @Get('feeds')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getFeeds(@AccessToken() accessToken: JwtPayload) {
    const { sub: userId } = accessToken;
    return {
      feeds: await this.feedService.getFeeds(userId),
    };
  }
}
