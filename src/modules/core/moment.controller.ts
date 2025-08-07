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
import { IdParamDto } from 'src/common/validators';
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
  async getHomeMoments(
    @AccessToken() { sub: userId }: JwtPayload,
    @Query() paginationDto: PaginationDto
  ) {
    return await this.momentService.getMoments('home', userId, paginationDto);
  }

  @Get('explore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getExploreMoments(
    @AccessToken() { sub: userId }: JwtPayload,
    @Query() exploreDto: ExploreDto
  ) {
    return await this.momentService.getMoments('explore', userId, exploreDto);
  }

  @Get('user/:id')
  @HttpCode(HttpStatus.OK)
  async getUserMoments(
    @Param() { id }: IdParamDto,
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
  async getMoment(@AccessToken() { sub: userId }: JwtPayload, @Param() { id }: IdParamDto) {
    return {
      moment: await this.momentService.getById(userId, id),
    };
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async likeMoment(@AccessToken() { sub: userId }: JwtPayload, @Param() { id }: IdParamDto) {
    return {
      like: await this.momentService.like(userId, id),
    };
  }

  @Delete(':id/unlike')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unlikeMoment(@AccessToken() { sub: userId }: JwtPayload, @Param() { id }: IdParamDto) {
    await this.momentService.unlike(userId, id);
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async bookmarkMoment(@AccessToken() { sub: userId }: JwtPayload, @Param() { id }: IdParamDto) {
    return {
      bookmark: await this.momentService.bookmark(userId, id),
    };
  }

  @Delete(':id/unbookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unbookmarkMoment(@AccessToken() { sub: userId }: JwtPayload, @Param() { id }: IdParamDto) {
    await this.momentService.unbookmark(userId, id);
  }

  @Post(':id/repost')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async repostMoment(
    @AccessToken() { sub: userId }: JwtPayload,
    @Param() { id }: IdParamDto,
    @Body() repostDto: RepostDto
  ) {
    const subject = {
      user: userId,
      moment: id,
    };
    return {
      repost: await this.momentService.repost(subject, repostDto),
    };
  }
}
