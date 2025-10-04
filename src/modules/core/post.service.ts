/*
 Notes:
 - When ordering by last_modified, we also order by id for consistent results when last_modified is the same
*/

import type { ResourceApiResponse } from 'cloudinary';
import type { FeedDto, PaginationDto as PaginationPayload } from 'api';
import type { Post, PostReport, PostStat, User } from 'schema';

type PostMetadata = {
  is_liked: boolean;
  is_bookmarked: boolean;
  is_reposted: boolean;
} & PostStat;

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import { CloudinaryService } from '../database/cloudinary.service';
import { UserService } from '../user/user.service';
import { CreatePostDto, ExploreDto, ReportPostDto, RepostDto, UserPostsDto } from './dto';
import { Auth } from 'src/common/helpers';
import { ContentPrivacy, INITIAL_PAGE } from 'src/common/constants';

import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TrendingService } from '../suggestion/trending.service';

// +++ TODO: Ongoing +++
type PaginationDto = any;

export const Message = {
  GetPosts: {
    PublicPost: 'Login to access more posts.',
    InvalidType: 'Invalid type.',
    Failed: 'Failed to get posts.',
  },
};

const METADATA_TEXT_LIMIT = 70;

@Injectable()
export class PostService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly userService: UserService,
    private readonly trendingService: TrendingService
  ) {}

  public async getHomePosts(userId: User['id'], { page, limit }: PaginationDto) {
    try {
      const followingUsers = await this.supabaseService.select('follows', {
        select: 'following_id',
        where: { follower_id: userId },
      });
      const followingIds = followingUsers.map((f) => f.following_id);

      const userIds = [...followingIds, userId];
      if (userIds.length === 0)
        return {
          total: 0,
          page,
          limit,
          hasNextPage: false,
          items: [],
        };

      const mutedUsers = await this.supabaseService.select('mutes', {
        select: 'muted_id',
        where: { muter_id: userId },
      });
      const mutedUserIds = new Set(mutedUsers.map((m) => m.muted_id));
      const allowedUserIds = userIds.filter((id) => !mutedUserIds.has(id));

      if (allowedUserIds.length === 0)
        return {
          page,
          limit,
          hasNextPage: false,
          items: [],
        };

      const posts = await this.supabaseService.select<any>('posts', {
        select: 'id::text,user_id,text,attachments,privacy,last_modified',
        whereIn: { user_id: allowedUserIds },
        whereLte: { privacy: ContentPrivacy.FOLLOWERS },
        orderBy: [
          {
            column: 'last_modified',
            ascending: false,
          },
          {
            column: 'id',
            ascending: false,
          },
        ],
        limit: limit + 1,
        offset: (page - INITIAL_PAGE) * limit,
      });

      const hasNextPage = posts.length > limit;
      const actualPosts = hasNextPage ? posts.slice(0, limit) : posts;

      const uniqueUserIds = [...new Set(actualPosts.map((post) => post.user_id))];
      const userSummaries = await this.userService.getUserSummaries(uniqueUserIds, userId);

      const userMap = new Map();
      if (!userSummaries) throw new BadRequestException('Something went wrong');
      userSummaries.forEach((summary) => {
        userMap.set(summary.id, summary);
      });

      const postIds = actualPosts.map((post) => post.id as string);
      const postStats = await this.getPostStats(postIds, userId);

      const statsMap = new Map<Post['id'], PostMetadata>();
      postStats.forEach((stat) => {
        statsMap.set(stat.post_id, stat);
      });

      const postItems = await Promise.all(
        actualPosts.map(async (post) => {
          const userSummary = userMap.get(post.user_id);
          if (!userSummary) return null;

          const stats = statsMap.get(post.id);

          return {
            id: post.id,
            user: userSummary,
            post: {
              text: post.text,
              files: await this.parseAttachments(post.attachments),
              likes: stats?.likes_count ?? 0,
              comments: stats?.comments_count ?? 0,
              reposts: stats?.reposts_count ?? 0,
              isLiked: stats?.is_liked ?? false,
              isBookmarked: stats?.is_bookmarked ?? false,
              lastModified: post.last_modified,
            },
          } satisfies FeedDto;
        })
      );

      const validPostItems = postItems.filter((item) => item !== null);

      const pagination: PaginationPayload<FeedDto> = {
        page,
        limit,
        hasNextPage,
        items: validPostItems,
      };

      return pagination;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getHomePosts',
        context: 'PostService',
      });
      throw new InternalServerErrorException(Message.GetPosts.Failed);
    }
  }

  public async getExplorePosts({ page, limit, type }: ExploreDto, userId?: User['id']) {
    try {
      const excludedUserIds = userId
        ? await this.userService.getExcludedUserIds(userId)
        : new Set<string>();

      const trendingMap = await this.trendingService.getTrendingHashtagScoreMap(200);

      const { data: exploreResults, error } = await this.supabaseService
        .getClient()
        .rpc('get_explore_posts', {
          p_current_user_id: userId,
          p_excluded_user_ids: Array.from(excludedUserIds),
          p_post_type: type,
          p_limit: limit + 1,
          p_offset: (page - INITIAL_PAGE) * limit,
          p_trending: trendingMap,
        });

      if (error) throw error;

      const hasNextPage = exploreResults && exploreResults.length > limit;
      const actualResults = hasNextPage ? exploreResults.slice(0, limit) : exploreResults;

      const postItems = await Promise.all(
        actualResults.map(async (result: any) => {
          const userSummary = result.user_summary;
          const postStats = result.post_stats;

          return {
            id: result.post_id.toString(),
            user: {
              id: userSummary.id,
              username: userSummary.username,
              displayName: userSummary.display_name,
              avatar: userSummary.avatar,
              bio: userSummary.bio,
              followers: userSummary.followers,
              following: userSummary.following,
              isFollowing: userSummary.is_following,
              hasStory: userSummary.has_story,
              followedBy: userSummary.followed_by,
            },
            post: {
              text: result.text,
              files: await this.parseAttachments(result.attachments),
              likes: postStats.likes_count,
              comments: postStats.comments_count,
              reposts: postStats.reposts_count,
              isLiked: postStats.is_liked,
              isBookmarked: postStats.is_bookmarked,
              lastModified: result.last_modified,
            },
          } satisfies FeedDto;
        })
      );

      const pagination: PaginationPayload<FeedDto> = {
        page,
        limit,
        hasNextPage,
        items: postItems,
      };

      return pagination;
    } catch (error) {
      this.logger.error(error.message, {
        context: 'PostService',
        location: 'getExplorePosts',
      });

      throw new InternalServerErrorException(Message.GetPosts.Failed);
    }
  }

  public async getUserPosts(
    {
      userId,
      currentUserId,
    }: {
      userId: User['id'];
      currentUserId: User['id'];
    },
    { page, limit, filter }: UserPostsDto
  ) {
    try {
      const userSummaries = await this.userService.getUserSummaries([userId], currentUserId);
      if (!userSummaries || userSummaries.length === 0) throw new Error('User summary not found');
      const userSummary = userSummaries[0];

      const privacyLevel =
        currentUserId === userId
          ? ContentPrivacy.PRIVATE
          : userSummary.isFollowing
            ? ContentPrivacy.FOLLOWERS
            : ContentPrivacy.PUBLIC;

      const posts = await this.supabaseService.select<any>('posts', {
        select: 'id::text,user_id,text,attachments,privacy,last_modified',
        where: { user_id: userId },
        whereLte: { privacy: privacyLevel },
        ...(filter === 'media' && { whereNotNull: ['attachments'] }),
        orderBy: [
          {
            column: 'last_modified',
            ascending: false,
          },
          {
            column: 'id',
            ascending: false,
          },
        ],
        limit: limit + 1,
        offset: (page - INITIAL_PAGE) * limit,
      });

      const hasNextPage = posts.length > limit;
      const actualPosts = hasNextPage ? posts.slice(0, limit) : posts;

      const postIds = actualPosts.map((post) => post.id as string);
      const postStats = await this.getPostStats(postIds, currentUserId);

      const statsMap = new Map<Post['id'], PostMetadata>();
      postStats.forEach((stat) => {
        statsMap.set(stat.post_id, stat);
      });

      const postItems = await Promise.all(
        actualPosts.map(async (post) => {
          const stats = statsMap.get(post.id);

          return {
            id: post.id,
            user: userSummary,
            post: {
              text: post.text,
              files: await this.parseAttachments(post.attachments),
              likes: stats?.likes_count ?? 0,
              comments: stats?.comments_count ?? 0,
              reposts: stats?.reposts_count ?? 0,
              isLiked: stats?.is_liked ?? false,
              isBookmarked: stats?.is_bookmarked ?? false,
              lastModified: post.last_modified,
            },
          };
        })
      );

      const pagination: PaginationPayload<FeedDto> = {
        page,
        limit,
        hasNextPage,
        items: postItems,
      };

      return pagination;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getUserPosts',
        context: 'PostService',
      });
      throw new InternalServerErrorException(Message.GetPosts.Failed);
    }
  }

  public async getById(postId: string, userId?: User['id']) {
    try {
      const posts = await this.supabaseService.select<
        Omit<Post, 'id'> & {
          id: string;
        }
      >('posts', {
        select: 'id::text,user_id,text,attachments,privacy,last_modified',
        where: { id: postId },
        limit: 1,
      });

      if (posts.length === 0) throw new NotFoundException('Post not found');
      const post = posts[0];

      const userSummaries = await this.userService.getUserSummaries([post.user_id], userId);
      if (!userSummaries || userSummaries.length === 0)
        throw new BadRequestException('User not found');

      const userSummary = userSummaries[0];

      const privacyLevel =
        userId === undefined
          ? ContentPrivacy.PUBLIC
          : userId === post.user_id
            ? ContentPrivacy.PRIVATE
            : userSummary.isFollowing
              ? ContentPrivacy.FOLLOWERS
              : ContentPrivacy.PUBLIC;

      if (post.privacy > privacyLevel)
        throw new ForbiddenException('You do not have permission to view this post');

      let postStats: PostMetadata | undefined;
      if (userId) {
        const stats = await this.getPostStats([postId.toString()], userId);
        postStats = stats[0];
      }

      const files = await this.parseAttachments(post.attachments);

      const result = {
        id: post.id,
        user: userSummary,
        post: {
          text: post.text,
          files,
          likes: postStats?.likes_count ?? 0,
          comments: postStats?.comments_count ?? 0,
          reposts: postStats?.reposts_count ?? 0,
          isLiked: postStats?.is_liked ?? false,
          isBookmarked: postStats?.is_bookmarked ?? false,
          lastModified: post.last_modified,
        },
      } satisfies FeedDto;

      return result;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getById',
        context: 'PostService',
      });

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;

      throw new InternalServerErrorException('Failed to get post');
    }
  }

  public async getMetadata(postId: string) {
    try {
      const posts = await this.supabaseService.select<
        Omit<Post, 'id'> & {
          id: string;
        }
      >('posts', {
        select: 'id::text,user_id,text,privacy',
        where: { id: postId },
        limit: 1,
      });

      if (posts.length === 0) throw new NotFoundException('Post not found');
      const post = posts[0];

      const userSummaries = await this.userService.getUserSummaries([post.user_id]);
      if (!userSummaries || userSummaries.length === 0)
        throw new BadRequestException('User not found');

      const userSummary = userSummaries[0];

      const isPublic = post.privacy === ContentPrivacy.PUBLIC;
      return {
        username: userSummary.username,
        displayName: userSummary.displayName,
        text:
          isPublic && post.text
            ? post.text.slice(0, METADATA_TEXT_LIMIT) +
              (post.text.length > METADATA_TEXT_LIMIT ? '...' : '')
            : 'This content is from a private account.',
        lastModified: post.last_modified,
      };
    } catch (error) {
      this.logger.error(error.message, {
        location: 'getMetadata',
        context: 'PostService',
      });

      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to get post metadata');
    }
  }

  private async getPostStats(postIds: string[], userId: User['id']) {
    try {
      if (postIds.length === 0) return [];

      const { data, error } = await this.supabaseService.getClient().rpc('get_post_stats_batch', {
        p_post_ids: postIds,
        p_current_user_id: userId,
      });

      if (error) throw error;
      return (data ?? []) as PostMetadata[];
    } catch (error) {
      this.logger.error(error.message, {
        context: 'PostService',
        location: 'getPostStats',
      });
      return [];
    }
  }

  public async create(userId: User['id'], data: CreatePostDto) {
    try {
      let hashtags: string[] | undefined = undefined;
      if (data.text) {
        hashtags = await this.trendingService.processPostHashtags(data.text);
        if (!hashtags) return undefined;
      }

      const { data: result, error } = await this.supabaseService
        .getClient()
        .rpc('create_post_with_hashtags', {
          p_user_id: userId,
          p_text: data.text,
          p_attachments: data.attachments,
          p_privacy: data.privacy,
          p_hashtags: hashtags,
        });

      if (error) throw error;
      if (!result) return undefined;

      await this.userService.updateUserStats(userId, 'posts_count', 1);

      return result;
    } catch (error) {
      this.logger.error(error.message, {
        context: 'PostService',
        location: 'create',
      });
      return undefined;
    }
  }

  public async like(userId: User['id'], postId: string) {
    try {
      const [likeRecord] = await this.supabaseService.insert('post_likes', {
        user_id: userId,
        post_id: postId,
      });

      await this.updatePostStats(postId, 'likes_count', 1);
      return likeRecord;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'like',
        context: 'PostService',
      });
      throw new BadRequestException('Failed to like post');
    }
  }

  public async unlike(userId: User['id'], postId: string) {
    try {
      await this.supabaseService.delete('post_likes', {
        user_id: userId,
        post_id: postId,
      });

      await this.updatePostStats(postId, 'likes_count', -1);
      return true;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'unlike',
        context: 'PostService',
      });
      throw new BadRequestException('Failed to unlike post');
    }
  }

  public async bookmark(userId: User['id'], postId: string) {
    try {
      const [bookmarkRecord] = await this.supabaseService.insert('post_bookmarks', {
        user_id: userId,
        post_id: postId,
      });

      await this.updatePostStats(postId, 'bookmarks_count', 1);
      return bookmarkRecord;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'bookmark',
        context: 'PostService',
      });
      throw new BadRequestException('Failed to bookmark post');
    }
  }

  public async unbookmark(userId: User['id'], postId: string) {
    try {
      await this.supabaseService.delete('post_bookmarks', {
        user_id: userId,
        post_id: postId,
      });

      await this.updatePostStats(postId, 'bookmarks_count', -1);
      return true;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'unbookmark',
        context: 'PostService',
      });
      throw new BadRequestException('Failed to unbookmark post');
    }
  }

  public async repost(
    subject: {
      user: User['id'];
      post: string;
    },
    data: RepostDto
  ) {
    // const moment = this.moments.find((moment) => moment.id === subject.moment);
    // if (!moment) throw new NotFoundException('Moment not found');

    const repostRecord = {
      id: Auth.generateId('uuid'),
      userId: subject.user,
      postId: subject.post,
      comment: data.comment ?? null,
      audience: data.audience,
      createdAt: new Date(),
    };

    return repostRecord;
  }

  public async report(postId: string, { type }: ReportPostDto) {
    try {
      const [newReport] = await this.supabaseService.insert<PostReport>('post_reports', {
        post_id: postId as any,
        type,
      });

      return newReport;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'reportPost',
        context: 'PostService',
      });
      throw new InternalServerErrorException('Failed to report post');
    }
  }

  public async updatePostStats(postId: string, field: keyof PostStat, increment: number) {
    try {
      const { error } = await this.supabaseService.getClient().rpc('increment_post_stat', {
        p_post_id: postId,
        p_field: field,
        p_increment: increment,
      });

      if (error) throw error;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'updatePostStats',
        context: 'PostService',
      });
    }
  }

  private async parseAttachments(attachments: Post['attachments']) {
    if (!attachments || attachments.length === 0) return null;
    try {
      // const imageAttachments = attachments.filter((att) => att.type === 'image');
      // const videoAttachments = attachments.filter((att) => att.type === 'video');

      // TEMPORARY
      // If MOCK_DATA is true, handle HTTP URLs directly
      const isMockData = this.configService.get<boolean>('MOCK_DATA', false);
      if (isMockData) {
        const parsedAttachments = attachments
          .map((attachment) => {
            // Check if the ID is an HTTP URL
            if (attachment.id.startsWith('http')) {
              // For HTTP URLs, determine aspect ratio from the URL or use default logic
              let aspectRatio: 'square' | 'portrait' | 'landscape' = 'square';

              // Try to determine aspect ratio from URL patterns or use random for demo
              if (attachment.id.includes('4096x4096') || Math.random() < 0.6) {
                aspectRatio = 'portrait';
              } else if (Math.random() < 0.3) {
                aspectRatio = 'landscape';
              }

              return {
                id: attachment.id, // Use the HTTP URL as the ID
                type: attachment.type,
                aspectRatio,
              };
            }

            // If not HTTP URL in mock mode, still try Cloudinary (fallback)
            return null;
          })
          .filter((att) => att !== null);

        if (parsedAttachments.length > 0) {
          return parsedAttachments;
        }
      }

      // Standard Cloudinary processing (when MOCK_DATA is false or HTTP URLs failed)
      const imageAttachments = attachments.filter(
        (att) => att.type === 'image' && !att.id.startsWith('http')
      );
      const videoAttachments = attachments.filter(
        (att) => att.type === 'video' && !att.id.startsWith('http')
      );
      // TEMPORARY

      const [imageResources, videoResources] = await Promise.all([
        this.cloudinaryService.getResources(
          imageAttachments.map((att) => att.id),
          'image'
        ),
        this.cloudinaryService.getResources(
          videoAttachments.map((att) => att.id),
          'video'
        ),
      ]);

      const resourceMap = new Map<string, ResourceApiResponse['resources'][number]>();
      [...imageResources.resources, ...videoResources.resources].forEach((resource) => {
        resourceMap.set(resource.public_id, resource);
      });

      const parsedAttachments = attachments.map((attachment) => {
        // TEMPORARY
        // Skip HTTP URLs if we're not in mock mode (they were handled above)
        if (attachment.id.startsWith('http') && !isMockData) return null;
        // TEMPORARY

        const resource = resourceMap.get(attachment.id);
        if (!resource) {
          this.logger.warn(`Resource not found: ${attachment.id} (${attachment.type})`, {
            location: 'parseAttachments',
            context: 'PostService',
          });
          return null;
        }

        const ratio = resource.width / resource.height;
        let aspectRatio: 'square' | 'portrait' | 'landscape' = 'square';
        if (ratio < 1) aspectRatio = 'portrait';
        if (ratio > 1) aspectRatio = 'landscape';

        return {
          id: resource.public_id,
          type: attachment.type,
          aspectRatio,
        };
      });

      const validAttachments = parsedAttachments.filter((attachment) => attachment !== null);
      return validAttachments.length > 0 ? validAttachments : null;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'parseAttachments',
        context: 'PostService',
      });
      throw new Error('Failed to parse attachments');
    }
  }
}
