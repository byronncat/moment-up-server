import type { JwtPayload } from 'jwt-library';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { AccessToken } from 'src/common/decorators';
import { AccessTokenGuard } from 'src/common/guards';
import { CreateCommentDto, PostCommentsDto } from './dto';

@Controller({
  path: 'comments',
  version: '1',
})
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('post/:postId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getComments(
    @Param('postId') postId: string,
    @Query() commentsDto: PostCommentsDto,
    @AccessToken() token: JwtPayload
  ) {
    const userId = token.sub ?? '';
    return this.commentService.getByPostId(
      {
        postId,
        currentUser: userId,
      },
      commentsDto
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async createComment(@Body() createDto: CreateCommentDto, @AccessToken() token: JwtPayload) {
    const userId = token.sub ?? '';
    return {
      comment: await this.commentService.create(createDto, userId),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async deleteComment(@Param('id') id: string, @AccessToken() token: JwtPayload) {
    const userId = token.sub ?? '';
    await this.commentService.delete(id, userId);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async likeComment(@Param('id') id: string, @AccessToken() token: JwtPayload) {
    const userId = token.sub ?? '';
    return {
      comment: await this.commentService.like(id, userId),
    };
  }

  @Delete(':id/unlike')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unlikeComment(@Param('id') id: string, @AccessToken() token: JwtPayload) {
    const userId = token.sub ?? '';
    await this.commentService.unlike(id, userId);
  }
}
