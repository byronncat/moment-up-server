import { createMockComments } from 'src/__mocks__/comment';
import type { PaginationDto as PaginationDtoApi, CommentPayload } from 'api';
import type { User, Post, Comment } from 'schema';

import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { PostService } from './post.service';
import { Auth } from 'src/common/helpers';
import { CommentDto } from './dto';

// +++ TODO: Ongoing +++
type PaginationDto = any;

@Injectable()
export class CommentService {
  private comments: CommentPayload[] = createMockComments();

  constructor(
    private readonly userService: UserService,
    private readonly postService: PostService
  ) {}

  public async get(postId: Post['id'], userId: User['id'], { page, limit }: PaginationDto) {
    const ownComments = this.comments.filter((comment) => comment.user.id === userId);
    const otherComments = this.comments.filter((comment) => comment.user.id !== userId);
    this.comments = [...ownComments, ...otherComments];

    const comments = this.comments.slice((page - 1) * limit, page * limit);
    const pagination: PaginationDtoApi<CommentPayload> = {
      total: this.comments.length,
      page,
      limit,
      hasNextPage: page < Math.ceil(this.comments.length / limit),
      items: comments,
    };
    return pagination;
  }

  public async add({ momentId: postId, content }: CommentDto, userId: User['id']) {
    // const user = await this.userService.getUserSummaryDto(userId);
    // if (!user) throw new NotFoundException('User not found');
    // const moment = await this.postService.getById(userId, postId);
    // if (!moment) throw new NotFoundException('Moment not found');
    // save comment to database
    // const comment = ...
    // const commentPayload: CommentPayload = {
    //   id: Auth.generateId('uuid'),
    //   user,
    //   content,
    //   likes: 0,
    //   isLiked: false,
    //   updatedAt: new Date().toISOString(),
    // };
    // this.comments.push(commentPayload);
    // return commentPayload;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async delete(id: Comment['id'], userId: User['id']) {
    const comment = this.comments.find((comment) => comment.id === id);
    if (!comment) throw new NotFoundException('Comment not found');
    this.comments = this.comments.filter((comment) => comment.id !== id);
    return comment;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async like(id: Comment['id'], userId: User['id']) {
    const comment = this.comments.find((comment) => comment.id === id);
    if (!comment) throw new NotFoundException('Comment not found');
    comment.likes++;
    return comment;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async unlike(id: Comment['id'], userId: User['id']) {
    const comment = this.comments.find((comment) => comment.id === id);
    if (!comment) throw new NotFoundException('Comment not found');
    comment.likes--;
    return comment;
  }
}
