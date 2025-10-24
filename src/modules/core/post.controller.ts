import type { JwtPayload } from 'jwt-library';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import {
  CreatePostDto,
  ExploreDto,
  PaginationDto,
  ReportPostDto,
  RepostDto,
  UpdatePostDto,
  UserPostsDto,
} from './dto';
import { ExploreType, INITIAL_PAGE } from 'src/common/constants';

@Controller({
  path: 'posts',
  version: '1',
})
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get('home')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getHomePosts(@Query() paginationDto: PaginationDto, @AccessToken() token: JwtPayload) {
    const userId = token.sub;
    return this.postService.getHomePosts(userId!, paginationDto);
  }

  @Get('explore')
  @HttpCode(HttpStatus.OK)
  async getExplorePosts(@Query() exploreDto: ExploreDto, @AccessToken() token?: JwtPayload) {
    if (!token) {
      if (exploreDto.page > INITIAL_PAGE)
        throw new ForbiddenException('You must be logged in to view more posts.');
      exploreDto.limit = exploreDto.type === ExploreType.MEDIA ? 12 : 7;
    }

    const userId = token?.sub;
    return this.postService.getExplorePosts(exploreDto, userId);
  }

  @Get('user/:id')
  @HttpCode(HttpStatus.OK)
  async getUserPosts(
    @Param('id') userId: string,
    @Query() userPostsDto: UserPostsDto,
    @AccessToken() token?: JwtPayload
  ) {
    if (!token) {
      if (userPostsDto.page > INITIAL_PAGE)
        throw new ForbiddenException('You must be logged in to view more posts.');
      userPostsDto.limit = 7;
    }

    const currentUserId = token?.sub;
    return this.postService.getUserPosts(
      {
        userId,
        currentUserId,
      },
      userPostsDto
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPost(@Param('id') postId: string, @AccessToken() token?: JwtPayload) {
    const userId = token?.sub;
    return {
      post: await this.postService.getById(postId, userId),
    };
  }

  @Get(':id/metadata')
  @HttpCode(HttpStatus.OK)
  async getPostMetadata(@Param('id') postId: string) {
    return {
      metadata: await this.postService.getMetadata(postId),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async createPost(@AccessToken() token: JwtPayload, @Body() createPostDto: CreatePostDto) {
    const userId = token.sub;
    const post = await this.postService.create(userId!, createPostDto);
    if (!post) throw new InternalServerErrorException('Something went wrong.');
    return {
      feed: post,
    };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async updatePost(
    @AccessToken() token: JwtPayload,
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto
  ) {
    const userId = token.sub;
    const post = await this.postService.update(
      {
        userId: userId!,
        postId: id,
      },
      updatePostDto
    );
    if (!post) throw new BadRequestException('Unable to update post.');
    return {
      feed: post,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async deletePost(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token.sub;
    await this.postService.delete(userId!, id);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async likePost(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token.sub ?? '';
    return {
      like: await this.postService.like(userId, id),
    };
  }

  @Delete(':id/unlike')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unlikePost(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token.sub ?? '';
    await this.postService.unlike(userId, id);
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async bookmarkPost(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token.sub ?? '';
    return {
      bookmark: await this.postService.bookmark(userId, id),
    };
  }

  @Delete(':id/unbookmark')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unbookmarkPost(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token.sub ?? '';
    await this.postService.unbookmark(userId, id);
  }

  @Post(':id/repost')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async repostPost(
    @AccessToken() token: JwtPayload,
    @Param('id') id: string,
    @Body() repostDto: RepostDto
  ) {
    const userId = token.sub ?? '';
    const subject = {
      user: userId,
      post: id,
    };
    return {
      repost: await this.postService.repost(subject, repostDto),
    };
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async reportPost(@Param('id') id: string, @Body() reportPostDto: ReportPostDto) {
    return {
      report: await this.postService.report(id, reportPostDto),
    };
  }
}
