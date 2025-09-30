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
import { CommentDto } from './dto/comment';

@Controller({
  path: 'comments',
  version: '1',
})
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // @Get('moment/:momentId')
  // @HttpCode(HttpStatus.OK)
  // @UseGuards(AccessTokenGuard)
  // async getComments(
  //   @Param('momentId') momentId: string,
  //   @Query() paginationDto: PaginationDto,
  //   @AccessToken() token: JwtPayload
  // ) {
  //   const userId = token?.sub || '';
  //   return await this.commentService.get(momentId, userId, paginationDto);
  // }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async addComment(@Body() commentDto: CommentDto, @AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    return {
      comment: await this.commentService.add(commentDto, userId),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async deleteComment(@Param('id') id: string, @AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    // await this.commentService.delete(id, userId);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async likeComment(@Param('id') id: string, @AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    return {
      // comment: await this.commentService.like(id, userId),
    };
  }

  @Delete(':id/unlike')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async unlikeComment(@Param('id') id: string, @AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    // await this.commentService.unlike(id, userId);
  }
}
