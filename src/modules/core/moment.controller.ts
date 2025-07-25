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
} from '@nestjs/common';
import { MomentService } from './moment.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import { PaginationDto, IdParamDto, RepostDto, ExploreDto, ProfileMomentDto } from './dto/intdex';

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
    @AccessToken() accessToken: JwtPayload,
    @Query() paginationDto: PaginationDto
  ) {
    const { sub: userId } = accessToken;
    return await this.momentService.getMoments('home', userId, paginationDto);
  }

  @Get('explore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getExploreMoments(@AccessToken() accessToken: JwtPayload, @Query() exploreDto: ExploreDto) {
    const { sub: userId } = accessToken;
    return await this.momentService.getMoments('explore', userId, exploreDto);
  }

  @Get('user/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getUserMoments(
    @Param() idParamDto: IdParamDto,
    @Query() profileMomentDto: ProfileMomentDto
  ) {
    return await this.momentService.getMoments('user', idParamDto.id, profileMomentDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getMoment(
    @AccessToken() accessToken: Partial<JwtPayload>,
    @Param() idParamDto: IdParamDto
  ) {
    const userId = accessToken?.sub || null;
    return {
      moment: await this.momentService.getById(userId, idParamDto.id),
    };
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async likeMoment(@AccessToken() accessToken: JwtPayload, @Param() idParamDto: IdParamDto) {
    const { sub: userId } = accessToken;
    return {
      like: await this.momentService.like(userId, idParamDto.id),
    };
  }

  @Delete(':id/unlike')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unlikeMoment(@AccessToken() accessToken: JwtPayload, @Param() idParamDto: IdParamDto) {
    const { sub: userId } = accessToken;
    await this.momentService.unlike(userId, idParamDto.id);
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async bookmarkMoment(@AccessToken() accessToken: JwtPayload, @Param() idParamDto: IdParamDto) {
    const { sub: userId } = accessToken;
    return {
      bookmark: await this.momentService.bookmark(userId, idParamDto.id),
    };
  }

  @Delete(':id/unbookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unbookmarkMoment(@AccessToken() accessToken: JwtPayload, @Param() idParamDto: IdParamDto) {
    const { sub: userId } = accessToken;
    await this.momentService.unbookmark(userId, idParamDto.id);
  }

  @Post(':id/repost')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async repostMoment(
    @AccessToken() accessToken: JwtPayload,
    @Param() idParamDto: IdParamDto,
    @Body() repostDto: RepostDto
  ) {
    const subject = {
      user: accessToken.sub,
      moment: idParamDto.id,
    };
    return {
      repost: await this.momentService.repost(subject, repostDto),
    };
  }
}
