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
import {
  CreatePostDto,
  ExploreDto,
  PaginationDto,
  ReportPostDto,
  RepostDto,
  UpdatePostDto,
  UserPostsDto,
} from './dto';
import { Auth } from 'src/common/helpers';
import { ContentPrivacy, INITIAL_PAGE } from 'src/common/constants';

import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { TrendingService } from '../suggestion/trending.service';

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

  public async getHomePosts(userId: string, { page, limit }: PaginationDto) {
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
      if (!userSummaries) throw new Error('User summaries not found.');
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
              privacy: post.privacy,
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
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async getExplorePosts({ page, limit, type }: ExploreDto, userId?: string) {
    try {
      const excludedUserIds = userId
        ? await this.userService.getExcludedUserIds(userId)
        : new Set<string>();

      const trendingMap = await this.trendingService.getTrendingHashtagScoreMap(200);

      const { data: exploreResults, error } = await this.supabaseService
        .getClient()
        .rpc('get_explore_posts', {
          p_current_user_id: userId ?? null, // using undefined can cause issues with the function
          p_excluded_user_ids: Array.from(excludedUserIds),
          p_post_type: type,
          p_limit: limit + 1,
          p_offset: (page - INITIAL_PAGE) * limit,
          p_trending: trendingMap,
        });

      if (error) throw error;

      const hasNextPage = exploreResults && exploreResults.length > limit;
      const actualResults = hasNextPage ? exploreResults.slice(0, limit) : exploreResults;

      if (actualResults.length === 0)
        return {
          page,
          limit,
          hasNextPage: false,
          items: [],
        };

      const uniqueUserIds: string[] = [
        ...new Set<string>(actualResults.map((result: any) => result.user_id as string)),
      ];
      const userSummaries = await this.userService.getUserSummaries(uniqueUserIds, userId);

      const userMap = new Map();
      if (!userSummaries) throw new Error('User summaries not found.');
      userSummaries.forEach((summary) => {
        userMap.set(summary.id, summary);
      });

      const postIds = actualResults.map((result: any) => result.post_id as string);
      const postStats = await this.getPostStats(postIds, userId);

      const statsMap = new Map<Post['id'], PostMetadata>();
      postStats.forEach((stat) => {
        statsMap.set(stat.post_id, stat);
      });

      const postItems = await Promise.all(
        actualResults.map(async (result: any) => {
          const userSummary = userMap.get(result.user_id);
          if (!userSummary) return null;

          const stats = statsMap.get(result.post_id);

          return {
            id: result.post_id.toString(),
            user: userSummary,
            post: {
              text: result.text,
              files: await this.parseAttachments(result.attachments),
              privacy: result.privacy,
              likes: stats?.likes_count ?? 0,
              comments: stats?.comments_count ?? 0,
              reposts: stats?.reposts_count ?? 0,
              isLiked: stats?.is_liked ?? false,
              isBookmarked: stats?.is_bookmarked ?? false,
              lastModified: result.last_modified,
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
        context: 'PostService',
        location: 'getExplorePosts',
      });

      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async getUserPosts(
    {
      userId,
      currentUserId,
    }: {
      userId: string;
      currentUserId?: string;
    },
    { page, limit, filter }: UserPostsDto
  ) {
    try {
      if (filter === 'bookmark') return await this.getUserBookmarks(userId, { page, limit });
      if (filter === 'like') return await this.getUserLikes(userId, { page, limit });

      const userSummaries = await this.userService.getUserSummaries([userId], currentUserId);
      if (!userSummaries || userSummaries.length === 0)
        throw new NotFoundException('User not found.');
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
              privacy: post.privacy,
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

      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  private async getUserBookmarks(userId: string, { page, limit }: PaginationDto) {
    try {
      const bookmarkedPosts = await this.supabaseService.select<any>('post_bookmarks', {
        select: `
          post_id,
          posts!inner(
            id::text,
            user_id,
            text,
            attachments,
            privacy,
            last_modified
          )
        `,
        where: { user_id: userId },
        orderBy: [
          {
            column: 'created_at',
            ascending: false,
          },
        ],
        limit: limit + 1,
        offset: (page - INITIAL_PAGE) * limit,
      });

      const hasNextPage = bookmarkedPosts.length > limit;
      const actualPosts = hasNextPage ? bookmarkedPosts.slice(0, limit) : bookmarkedPosts;

      if (actualPosts.length === 0)
        return {
          page,
          limit,
          hasNextPage: false,
          items: [],
        };

      const posts = actualPosts.map((bookmark) => bookmark.posts);
      const uniqueUserIds = [...new Set(posts.map((post) => post.user_id))];
      const userSummaries = await this.userService.getUserSummaries(uniqueUserIds, userId);

      const userMap = new Map();
      if (!userSummaries) throw new Error('User summaries not found.');
      userSummaries.forEach((summary) => {
        userMap.set(summary.id, summary);
      });

      const postIds = posts.map((post) => post.id as string);
      const postStats = await this.getPostStats(postIds, userId);

      const statsMap = new Map<Post['id'], PostMetadata>();
      postStats.forEach((stat) => {
        statsMap.set(stat.post_id, stat);
      });

      const postItems = await Promise.all(
        posts.map(async (post) => {
          const userSummary = userMap.get(post.user_id);
          if (!userSummary) return null;

          const stats = statsMap.get(post.id);

          return {
            id: post.id,
            user: userSummary,
            post: {
              text: post.text,
              files: await this.parseAttachments(post.attachments),
              privacy: post.privacy,
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
        location: 'getUserBookmarks',
        context: 'PostService',
      });
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  private async getUserLikes(userId: string, { page, limit }: PaginationDto) {
    try {
      const likedPosts = await this.supabaseService.select<any>('post_likes', {
        select: `
          post_id,
          posts!inner(
            id::text,
            user_id,
            text,
            attachments,
            privacy,
            last_modified
          )
        `,
        where: { user_id: userId },
        orderBy: [
          {
            column: 'created_at',
            ascending: false,
          },
        ],
        limit: limit + 1,
        offset: (page - INITIAL_PAGE) * limit,
      });

      const hasNextPage = likedPosts.length > limit;
      const actualPosts = hasNextPage ? likedPosts.slice(0, limit) : likedPosts;

      if (actualPosts.length === 0)
        return {
          page,
          limit,
          hasNextPage: false,
          items: [],
        };

      const posts = actualPosts.map((like) => like.posts);
      const uniqueUserIds = [...new Set(posts.map((post) => post.user_id))];
      const userSummaries = await this.userService.getUserSummaries(uniqueUserIds, userId);

      const userMap = new Map();
      if (!userSummaries) throw new Error('User summaries not found.');
      userSummaries.forEach((summary) => {
        userMap.set(summary.id, summary);
      });

      const postIds = posts.map((post) => post.id as string);
      const postStats = await this.getPostStats(postIds, userId);

      const statsMap = new Map<Post['id'], PostMetadata>();
      postStats.forEach((stat) => {
        statsMap.set(stat.post_id, stat);
      });

      const postItems = await Promise.all(
        posts.map(async (post) => {
          const userSummary = userMap.get(post.user_id);
          if (!userSummary) return null;

          const stats = statsMap.get(post.id);

          return {
            id: post.id,
            user: userSummary,
            post: {
              text: post.text,
              files: await this.parseAttachments(post.attachments),
              privacy: post.privacy,
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
        location: 'getUserLikes',
        context: 'PostService',
      });
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async search(
    query: string,
    page: number,
    limit: number,
    options?: { mediaOnly?: boolean; currentUserId?: User['id'] }
  ) {
    try {
      const posts = await this.supabaseService.select<any>('posts', {
        select: 'id::text,user_id,text,attachments,privacy,last_modified',
        whereLte: { privacy: ContentPrivacy.PUBLIC },
        ...(options?.mediaOnly ? { whereNotNull: ['attachments'] } : {}),
        caseSensitive: false,
        orWhere: { text: `%${query}%` },
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

      if (actualPosts.length === 0)
        return {
          page,
          limit,
          hasNextPage: false,
          items: [],
        } as PaginationPayload<FeedDto>;

      const uniqueUserIds = [...new Set(actualPosts.map((post) => post.user_id))];
      const userSummaries = await this.userService.getUserSummaries(
        uniqueUserIds,
        options?.currentUserId
      );

      const userMap = new Map();
      if (!userSummaries) throw new Error('User summaries not found.');
      userSummaries.forEach((summary) => {
        userMap.set(summary.id, summary);
      });

      let statsMap = new Map<Post['id'], PostMetadata>();
      if (options?.currentUserId) {
        const postIds = actualPosts.map((post) => post.id as string);
        const postStats = await this.getPostStats(postIds, options.currentUserId);
        statsMap = new Map<Post['id'], PostMetadata>();
        postStats.forEach((stat) => {
          statsMap.set(stat.post_id, stat);
        });
      }

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
              privacy: post.privacy,
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
        items: validPostItems as FeedDto[],
      };

      return pagination;
    } catch (error) {
      this.logger.error(error.message, {
        location: 'search',
        context: 'PostService',
      });
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  public async getById(postId: string, userId?: string) {
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

      if (posts.length === 0) throw new NotFoundException('Post not found.');
      const post = posts[0];

      const userSummaries = await this.userService.getUserSummaries([post.user_id], userId);
      if (!userSummaries || userSummaries.length === 0)
        throw new NotFoundException('User not found.');

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
        throw new ForbiddenException('You do not have permission to view this post.');

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
          privacy: post.privacy,
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

      if (error instanceof ForbiddenException || error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Something went wrong.');
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

      if (posts.length === 0) throw new NotFoundException('Post not found.');
      const post = posts[0];

      const userSummaries = await this.userService.getUserSummaries([post.user_id]);
      if (!userSummaries || userSummaries.length === 0)
        throw new NotFoundException('User not found.');

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

      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Something went wrong.');
    }
  }

  private async getPostStats(postIds: string[], userId?: string) {
    try {
      if (postIds.length === 0) return [];

      const { data, error } = await this.supabaseService.getClient().rpc('get_post_stats_batch', {
        p_post_ids: postIds,
        p_current_user_id: userId ?? null,
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

  public async create(userId: string, data: CreatePostDto) {
    try {
      let hashtags: string[] | null = null;
      if (data.text) {
        const processedHashtags = await this.trendingService.processPostHashtags(data.text);
        if (!processedHashtags) return undefined;
        hashtags = processedHashtags;
      }

      const attachments = data.attachments
        ? data.attachments.map((att) => ({ id: att.id, type: att.type }))
        : null;
      const { data: result, error } = await this.supabaseService
        .getClient()
        .rpc('create_post_with_hashtags', {
          p_user_id: userId,
          p_text: data.text ?? null,
          p_attachments: attachments,
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

  public async update(
    { userId, postId }: { userId: string; postId: string },
    { text, privacy }: UpdatePostDto
  ) {
    try {
      let hashtags: string[] | null = null;
      if (text) {
        const processedHashtags = await this.trendingService.processPostHashtags(text);
        if (!processedHashtags) return undefined;
        hashtags = processedHashtags;
      }

      const { data: result, error } = await this.supabaseService
        .getClient()
        .rpc('update_post_with_hashtags', {
          p_user_id: userId,
          p_post_id: postId,
          p_text: text || null,
          p_privacy: privacy,
          p_hashtags: hashtags,
        });

      if (error) throw error;
      if (!result) return undefined;

      return result;
    } catch (error) {
      this.logger.error(error.message, {
        context: 'PostService',
        location: 'update',
      });

      return undefined;
    }
  }

  public async delete(userId: string, postId: string) {
    try {
      const deletedPosts = await this.supabaseService.delete('posts', {
        user_id: userId,
        id: postId,
      });

      if (deletedPosts.length === 0) throw new NotFoundException('Post not found.');
      const post = deletedPosts[0];

      if (post.attachments && post.attachments.length > 0)
        await this.deletePostAttachments(post.attachments);

      await this.userService.updateUserStats(userId, 'posts_count', -1);
    } catch (error) {
      this.logger.error(error.message, {
        location: 'delete',
        context: 'PostService',
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

  private async deletePostAttachments(attachments: Post['attachments']) {
    if (!attachments || attachments.length === 0) return;

    try {
      // TEMPORARY
      // If MOCK_DATA is true, skip HTTP URLs (they don't need deletion)
      const isMockData = this.configService.get<boolean>('MOCK_DATA', false);
      if (isMockData) {
        const cloudinaryAttachments = attachments.filter((att) => !att.id.startsWith('http'));
        if (cloudinaryAttachments.length === 0) return;

        await Promise.all(
          cloudinaryAttachments.map((attachment) => this.deleteAttachment(attachment.id))
        );
        return;
      }
      // TEMPORARY

      // Delete all attachments from Cloudinary
      await Promise.all(attachments.map((attachment) => this.deleteAttachment(attachment.id)));
    } catch (error) {
      this.logger.error(error.message, {
        location: 'deletePostAttachments',
        context: 'PostService',
      });
    }
  }

  private async deleteAttachment(publicId: string): Promise<void> {
    try {
      // TEMPORARY
      const isHttp = publicId.startsWith('http');
      if (isHttp) return;
      // TEMPORARY

      await this.cloudinaryService.destroy(publicId);
    } catch (error) {
      this.logger.error(error.message, {
        context: 'PostService',
        location: 'deleteAttachment',
      });
    }
  }
}
