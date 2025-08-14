import type { JwtPayload } from 'library';
import {
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  UseGuards,
  Post,
  Param,
  Delete,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { MomentService } from './moment.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import { PaginationDto, RepostDto, ExploreDto, ProfileMomentDto } from './dto';
import { INITIAL_PAGE } from 'src/common/constants';

@Controller({
  path: 'moments',
  version: '1',
})
export class MomentController {
  constructor(private readonly momentService: MomentService) {}

  @Get('home')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getHomeMoments(@AccessToken() token: JwtPayload, @Query() paginationDto: PaginationDto) {
    const userId = token?.sub || '';
    return await this.momentService.getMoments('home', userId, paginationDto);
  }

  @Get('explore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getExploreMoments(@AccessToken() token: JwtPayload, @Query() exploreDto: ExploreDto) {
    const userId = token?.sub || '';
    return await this.momentService.getMoments('explore', userId, exploreDto);
  }

  @Get('user/:id')
  @HttpCode(HttpStatus.OK)
  async getUserMoments(
    @Param('id') id: string,
    @Query() { page, limit }: ProfileMomentDto,
    @AccessToken() accessToken?: JwtPayload
  ) {
    if (!accessToken && page > INITIAL_PAGE)
      throw new ForbiddenException('Login to access more posts');
    return await this.momentService.getMoments('user', id, {
      page,
      limit: accessToken ? limit : 12,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getMoment(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token?.sub || '';
    return {
      moment: await this.momentService.getById(userId, id),
    };
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async likeMoment(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token?.sub || '';
    return {
      like: await this.momentService.like(userId, id),
    };
  }

  @Delete(':id/unlike')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unlikeMoment(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token?.sub || '';
    await this.momentService.unlike(userId, id);
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async bookmarkMoment(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token?.sub || '';
    return {
      bookmark: await this.momentService.bookmark(userId, id),
    };
  }

  @Delete(':id/unbookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unbookmarkMoment(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token?.sub || '';
    await this.momentService.unbookmark(userId, id);
  }

  @Post(':id/repost')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async repostMoment(
    @AccessToken() token: JwtPayload,
    @Param('id') id: string,
    @Body() repostDto: RepostDto
  ) {
    const userId = token?.sub || '';
    const subject = {
      user: userId,
      moment: id,
    };
    return {
      repost: await this.momentService.repost(subject, repostDto),
    };
  }
}
