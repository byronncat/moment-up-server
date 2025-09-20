import type { User, Post as PostSchema } from 'schema';
import type { JwtPayload } from 'jwt-library';

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
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import { RepostDto, ExploreDto, ProfileMomentDto, PaginationDto, CreatePostDto } from './dto';
import { INITIAL_PAGE } from 'src/common/constants';

@Controller({
  path: 'posts',
  version: '1',
})
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get('home')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getHomeMoments(@AccessToken() token: JwtPayload, @Query() paginationDto: PaginationDto) {
    const userId = token?.sub || '';
    return await this.postService.getMoments('home', userId, paginationDto);
  }

  @Get('explore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getExploreMoments(@AccessToken() token: JwtPayload, @Query() exploreDto: ExploreDto) {
    const userId = token?.sub || '';
    return await this.postService.getMoments('explore', userId, exploreDto);
  }

  @Get('user/:id')
  @HttpCode(HttpStatus.OK)
  async getUserMoments(
    @Param('id') id: User['id'],
    @Query() { page, limit }: ProfileMomentDto,
    @AccessToken() accessToken?: JwtPayload
  ) {
    if (!accessToken && page > INITIAL_PAGE)
      throw new ForbiddenException('Login to access more posts');
    return await this.postService.getMoments('user', id, {
      page,
      limit: accessToken ? limit : 12,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getMoment(@AccessToken() token: JwtPayload, @Param('id') id: PostSchema['id']) {
    const userId = token?.sub || '';
    return {
      moment: await this.postService.getById(userId, id),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async createPost(@AccessToken() token: JwtPayload, @Body() createPostDto: CreatePostDto) {
    const userId = token?.sub || '';
    if (!userId) throw new UnauthorizedException('User not found');
    const post = await this.postService.create(userId, createPostDto);
    if (!post) throw new InternalServerErrorException('Failed to create post');
    return {
      post,
    };
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async likeMoment(@AccessToken() token: JwtPayload, @Param('id') id: PostSchema['id']) {
    const userId = token?.sub || '';
    return {
      like: await this.postService.like(userId, id),
    };
  }

  @Delete(':id/unlike')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unlikeMoment(@AccessToken() token: JwtPayload, @Param('id') id: PostSchema['id']) {
    const userId = token?.sub || '';
    await this.postService.unlike(userId, id);
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async bookmarkMoment(@AccessToken() token: JwtPayload, @Param('id') id: PostSchema['id']) {
    const userId = token?.sub || '';
    return {
      bookmark: await this.postService.bookmark(userId, id),
    };
  }

  @Delete(':id/unbookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unbookmarkMoment(@AccessToken() token: JwtPayload, @Param('id') id: PostSchema['id']) {
    const userId = token?.sub || '';
    await this.postService.unbookmark(userId, id);
  }

  @Post(':id/repost')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async repostMoment(
    @AccessToken() token: JwtPayload,
    @Param('id') id: PostSchema['id'],
    @Body() repostDto: RepostDto
  ) {
    const userId = token?.sub || '';
    const subject = {
      user: userId,
      moment: id,
    };
    return {
      repost: await this.postService.repost(subject, repostDto),
    };
  }
}
