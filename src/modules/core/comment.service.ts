import type { CommentDto as CommentPayload, PaginationDto as PaginationPayload } from 'api';
import type { Comment, User } from 'schema';

import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

import { SupabaseService } from '../database/supabase.service';
import { UserService } from '../user/user.service';
import { PostService } from './post.service';
import { CreateCommentDto, PostCommentsDto } from './dto';
import { INITIAL_PAGE } from 'src/common/constants';

export const Message = {
  NotFound: 'Comment not found.',
  Failed: 'Comment operation failed.',
  UserNotFound: 'User not found.',

  AddFailed: 'Unable to add comment.',
  DeleteFailed: 'Unable to delete comment.',
  LikeFailed: 'Unable to like comment.',
  UnlikeFailed: 'Unable to unlike comment.',
};

@Injectable()
export class CommentService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly supabaseService: SupabaseService,
    private readonly userService: UserService,
    private readonly postService: PostService
  ) {}

  public async getByPostId(
    {
      postId,
      currentUser,
    }: {
      postId: string;
      currentUser: User['id'];
    },
    { page, limit, sortBy }: PostCommentsDto
  ): Promise<PaginationPayload<CommentPayload>> {
    try {
      const offset = (page - INITIAL_PAGE) * limit;
      const { data: comments, error } = await this.supabaseService
        .getClient()
        .rpc('get_comments_with_stats', {
          p_post_id: postId,
          p_current_user_id: currentUser,
          p_limit: limit + 1,
          p_offset: offset,
          p_sort_by: sortBy,
        });

      if (error) throw error;
      if (comments.length === 0)
        return {
          page,
          limit,
          hasNextPage: false,
          items: [],
        };

      const hasNextPage = comments && comments.length > limit;
      const actualComments = hasNextPage ? comments.slice(0, limit) : comments;

      const uniqueUserIds = [
        ...new Set(actualComments.map((comment: any) => comment.user_id)),
      ] as string[];

      const userSummaries = await this.userService.getUserSummaries(uniqueUserIds, currentUser);
      if (!userSummaries) throw new InternalServerErrorException(Message.UserNotFound);

      const userMap = new Map();
      userSummaries.forEach((summary) => {
        userMap.set(summary.id, summary);
      });

      const commentItems: CommentPayload[] = actualComments.map((comment: any) => {
        const userSummary = userMap.get(comment.user_id);
        if (!userSummary) throw new InternalServerErrorException(Message.UserNotFound);

        return {
          id: comment.id,
          user: {
            id: userSummary.id,
            username: userSummary.username,
            displayName: userSummary.displayName,
            avatar: userSummary.avatar,
            bio: userSummary.bio,
            followers: userSummary.followers,
            following: userSummary.following,
            isFollowing: userSummary.isFollowing,
            hasStory: userSummary.hasStory,
            followedBy: userSummary.followedBy,
          },
          text: comment.text,
          likes: comment.likes_count,
          isLiked: comment.is_liked,
          lastModified: comment.last_modified,
        };
      });

      const pagination: PaginationPayload<CommentPayload> = {
        page,
        limit,
        hasNextPage,
        items: commentItems,
      };

      return pagination;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getByPostId',
        context: 'CommentService',
      });

      throw new BadRequestException(Message.Failed);
    }
  }

  public async create(
    { text, postId }: CreateCommentDto,
    userId: User['id']
  ): Promise<CommentPayload> {
    try {
      const [newComment] = await this.supabaseService.insert<Omit<Comment, 'id'> & { id: string }>(
        'comments',
        {
          user_id: userId,
          post_id: postId as any,
          text,
        },
        'id::text,text,last_modified'
      );

      const userSummaries = await this.userService.getUserSummaries([userId], userId);
      if (!userSummaries) throw new BadRequestException(Message.UserNotFound);
      const userSummary = userSummaries[0];

      const commentPayload: CommentPayload = {
        id: newComment.id,
        user: {
          id: userSummary.id,
          username: userSummary.username,
          displayName: userSummary.displayName,
          avatar: userSummary.avatar,
          bio: userSummary.bio,
          followers: userSummary.followers,
          following: userSummary.following,
          isFollowing: userSummary.isFollowing,
          hasStory: userSummary.hasStory,
          followedBy: userSummary.followedBy,
        },
        text: newComment.text,
        likes: 0,
        isLiked: false,
        lastModified: newComment.last_modified,
      };

      return commentPayload;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'create',
        context: 'CommentService',
      });

      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(Message.AddFailed);
    }
  }

  public async delete(commentId: string, userId: User['id']): Promise<void> {
    try {
      const [comment] = await this.supabaseService.delete(
        'comments',
        {
          id: commentId,
          user_id: userId,
        },
        'post_id::text'
      );

      await this.postService.updatePostStats(comment.post_id, 'comments_count', -1);
    } catch (error) {
      this.logger.error(error.message, {
        location: 'delete',
        context: 'CommentService',
      });

      throw new BadRequestException(Message.DeleteFailed);
    }
  }

  public async like(commentId: string, userId: User['id']) {
    try {
      const [newLike] = await this.supabaseService.insert('comment_likes', {
        user_id: userId,
        comment_id: commentId,
      });

      await this.supabaseService.getClient().rpc('increment_comment_stat', {
        p_comment_id: commentId,
        p_field: 'likes_count',
        p_increment: 1,
      });

      return newLike;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'like',
        context: 'CommentService',
      });

      throw new InternalServerErrorException(Message.LikeFailed);
    }
  }

  public async unlike(commentId: string, userId: User['id']) {
    try {
      await this.supabaseService.delete('comment_likes', {
        user_id: userId,
        comment_id: commentId,
      });

      await this.supabaseService.getClient().rpc('increment_comment_stat', {
        p_comment_id: commentId,
        p_field: 'likes_count',
        p_increment: -1,
      });
    } catch (error) {
      this.logger.error(error.message, {
        location: 'unlike',
        context: 'CommentService',
      });

      throw new InternalServerErrorException(Message.UnlikeFailed);
    }
  }
}
