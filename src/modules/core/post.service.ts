import { mockMoments } from 'src/__mocks__/moment';
import type { PaginationDto as PaginationApi, MomentPayload } from 'api';
import type { Bookmark, MomentLike, Post, Repost, User } from 'schema';

import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import { CloudinaryService } from '../database/cloudinary.service';
import { UserService } from '../user/user.service';
import { Auth } from 'src/common/helpers';
import { RepostDto, ExploreDto, ProfileMomentDto, CreatePostDto } from './dto';
import { PaginationDto } from 'src/common/validators';

import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class PostService {
  private moments = mockMoments;
  private likes: MomentLike[] = [];
  private bookmarks: Bookmark[] = [];
  private reposts: Repost[] = [];

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  public async getMoments(
    type: 'home' | 'explore' | 'user',
    userId: User['id'],
    dto: PaginationDto | ExploreDto | ProfileMomentDto
  ): Promise<PaginationApi<MomentPayload>> {
    switch (type) {
      case 'home':
        return this.geHometMoments(userId, dto as PaginationDto);
      case 'explore':
        return this.geExploreMoments(userId, dto as ExploreDto);
      case 'user':
        return this.getUserMoments(userId, dto as ProfileMomentDto);
      default:
        return this.geHometMoments(userId, dto as PaginationDto);
    }
  }

  public async geHometMoments(userId: User['id'], { page, limit }: PaginationDto) {
    try {
      const followingUsers = await this.supabaseService.select('follows', {
        select: 'following_id',
        where: { follower_id: userId },
      });
      const followingIds = followingUsers.map((f) => f.following_id);
      
      // Include the current user's own posts
      const userIds = [...followingIds, userId];

      // If no users to show posts from, return empty result
      if (userIds.length === 0) {
        return {
          total: 0,
          page,
          limit,
          hasNextPage: false,
          items: [],
        };
      }

      // Get total count of posts from followed users and own posts
      const totalCount = await this.supabaseService.count('posts', {
        whereIn: { user_id: userIds },
      });

      // Get paginated posts from followed users and own posts
      const posts = await this.supabaseService.select<Post>('posts', {
        whereIn: { user_id: userIds },
        orderBy: {
          column: 'last_modified',
          ascending: false,
        },
        limit,
        offset: (page - 1) * limit,
      });

      // Get user summaries for all unique user IDs in the posts
      const uniqueUserIds = [...new Set(posts.map(post => post.user_id))];
      const userSummaries = await Promise.all(
        uniqueUserIds.map(async (uid) => ({
          id: uid,
          summary: await this.userService.getUserSummary(uid)
        }))
      );
      
      // Create a map for quick user lookup
      const userMap = new Map();
      userSummaries.forEach(({ id, summary }) => {
        if (summary) userMap.set(id, summary);
      });

      // Convert posts to MomentPayload with mock interaction data
      const momentItems = await Promise.all(
        posts.map(async (post) => {
          const userSummary = userMap.get(post.user_id);
          if (!userSummary) return null;

          // Generate mock interaction data (TODO: replace with real data later)
          const likes = Math.floor(Math.random() * 1000);
          const comments = Math.floor(Math.random() * 100);
          const reposts = Math.floor(Math.random() * 50);

          return {
            id: post.id,
            user: userSummary,
            post: {
              text: post.text,
              files: await this.parseAttachments(post.attachments),
              likes,
              comments,
              reposts,
              isLiked: Math.random() > 0.7, // 30% chance of being liked
              isBookmarked: Math.random() > 0.8, // 20% chance of being bookmarked
              isReposted: false, // TODO: implement real repost logic
              lastModified: post.last_modified,
            },
          };
        })
      );

      // Filter out null results
      const validMomentItems = momentItems.filter(item => item !== null);

      const pagination: PaginationApi<MomentPayload> = {
        total: totalCount,
        page,
        limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        items: validMomentItems,
      };

      return pagination;
    } catch (error) {
      this.logger.error('Failed to get home moments', {
        context: 'PostService',
        location: 'geHometMoments',
        error: error.message,
        userId,
      });
      
      // Return empty pagination on error
      return {
        total: 0,
        page,
        limit,
        hasNextPage: false,
        items: [],
      };
    }
  }

  private async geExploreMoments(userId: User['id'], { page, limit, type }: ExploreDto) {
    try {
      // Get users that the current user is following
      const followingUsers = await this.supabaseService.select('follows', {
        select: 'following_id',
        where: { follower_id: userId },
      });
      const followingIds = followingUsers.map((f) => f.following_id);
      
      // Exclude the current user and users they're following
      const excludedUserIds = [...followingIds, userId];

      // Build query options with proper filtering
      let countOptions: any = {};
      let selectOptions: any = {
        orderBy: {
          column: 'created_at', // Use created_at for more random-like distribution
          ascending: false,
        },
        limit,
        offset: (page - 1) * limit,
      };

      // Only add whereNotIn if there are users to exclude
      if (excludedUserIds.length > 0) {
        countOptions.whereNotIn = { user_id: excludedUserIds };
        selectOptions.whereNotIn = { user_id: excludedUserIds };
      }

      // Get total count of explore posts
      const totalCount = await this.supabaseService.count('posts', countOptions);

      // Get paginated posts for explore feed
      const posts = await this.supabaseService.select<Post>('posts', selectOptions);

      // Filter posts with media if type is 'media' (additional client-side filter for safety)
      const filteredPosts = type === 'media' 
        ? posts.filter(post => post.attachments && post.attachments.length > 0)
        : posts;

      // Get user summaries for all unique user IDs in the posts
      const uniqueUserIds = [...new Set(filteredPosts.map(post => post.user_id))];
      const userSummaries = await Promise.all(
        uniqueUserIds.map(async (uid) => ({
          id: uid,
          summary: await this.userService.getUserSummary(uid)
        }))
      );
      
      // Create a map for quick user lookup
      const userMap = new Map();
      userSummaries.forEach(({ id, summary }) => {
        if (summary) userMap.set(id, summary);
      });

      // Convert posts to MomentPayload with mock interaction data
      const momentItems = await Promise.all(
        filteredPosts.map(async (post) => {
          const userSummary = userMap.get(post.user_id);
          if (!userSummary) return null;

          // Generate mock interaction data (TODO: replace with real data later)
          const likes = Math.floor(Math.random() * 1000);
          const comments = Math.floor(Math.random() * 100);
          const reposts = Math.floor(Math.random() * 50);

          return {
            id: post.id,
            user: userSummary,
            post: {
              text: post.text,
              files: await this.parseAttachments(post.attachments),
              likes,
              comments,
              reposts,
              isLiked: Math.random() > 0.7, // 30% chance of being liked
              isBookmarked: Math.random() > 0.8, // 20% chance of being bookmarked
              isReposted: false, // TODO: implement real repost logic
              lastModified: post.last_modified,
            },
          };
        })
      );

      // Filter out null results
      const validMomentItems = momentItems.filter(item => item !== null);

      const pagination: PaginationApi<MomentPayload> = {
        total: totalCount,
        page,
        limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        items: validMomentItems,
      };

      return pagination;
    } catch (error) {
      this.logger.error('Failed to get explore moments', {
        context: 'PostService',
        location: 'geExploreMoments',
        error: error.message,
        userId,
        type,
      });
      
      // Return empty pagination on error
      return {
        total: 0,
        page,
        limit,
        hasNextPage: false,
        items: [],
      };
    }
  }

  private async getUserMoments(userId: User['id'], { page, limit, filter }: ProfileMomentDto) {
    try {
      // Build query options based on filter
      let countOptions: any = {
        where: { user_id: userId }
      };
      
      let selectOptions: any = {
        where: { user_id: userId },
        orderBy: {
          column: 'last_modified',
          ascending: false,
        },
        limit,
        offset: (page - 1) * limit,
      };

      // Apply filter if specified
      // Note: For 'media' filter, we'll do client-side filtering since we need to check if attachments array has content
      // Other filters (tagged, reposts, liked) would require additional database tables/relationships

      // Get total count of user's posts
      const totalCount = await this.supabaseService.count('posts', countOptions);

      // Get paginated posts
      const posts = await this.supabaseService.select<Post>('posts', selectOptions);

      // Apply client-side filtering for media posts
      const filteredPosts = filter === 'media' 
        ? posts.filter(post => post.attachments && post.attachments.length > 0)
        : posts;

      // Get user summary for the posts
      const userSummary = await this.userService.getUserSummary(userId);
      if (!userSummary) {
        return {
          total: 0,
          page,
          limit,
          hasNextPage: false,
          items: [],
        };
      }

      // Convert posts to MomentPayload with mock interaction data
      const momentItems = await Promise.all(
        filteredPosts.map(async (post) => {
          // Generate mock interaction data
          const likes = Math.floor(Math.random() * 1000);
          const comments = Math.floor(Math.random() * 100);
          const reposts = Math.floor(Math.random() * 50);

          return {
            id: post.id,
            user: userSummary,
            post: {
              text: post.text,
              files: await this.parseAttachments(post.attachments),
              likes,
              comments,
              reposts,
              isLiked: Math.random() > 0.7, // 30% chance of being liked
              isBookmarked: Math.random() > 0.8, // 20% chance of being bookmarked
              lastModified: post.last_modified,
            },
          };
        })
      );

      // For media filter, we need to adjust the total count since we're doing client-side filtering
      // This is not ideal for pagination, but works for now until we implement proper database filtering
      let adjustedTotal = totalCount;
      if (filter === 'media') {
        // For media filter, we need to count all posts with attachments
        // This is a rough approximation - in production, you'd want proper database filtering
        const allUserPosts = await this.supabaseService.select<Post>('posts', {
          where: { user_id: userId },
          select: 'attachments',
        });
        adjustedTotal = allUserPosts.filter(post => post.attachments && post.attachments.length > 0).length;
      }

      const pagination: PaginationApi<MomentPayload> = {
        total: adjustedTotal,
        page,
        limit,
        hasNextPage: page < Math.ceil(adjustedTotal / limit),
        items: momentItems,
      };

      return pagination;
    } catch (error) {
      this.logger.error('Failed to get user moments', {
        context: 'PostService',
        location: 'getUserMoments',
        error: error.message,
        userId,
        filter,
      });
      
      // Return empty pagination on error
      return {
        total: 0,
        page,
        limit,
        hasNextPage: false,
        items: [],
      };
    }
  }

  public async getById(userId: User['id'] | null, id: Post['id']) {
    const moment = this.moments.find((moment) => moment.id === id);
    if (!moment) throw new NotFoundException('Moment not found');

    const isLiked = userId
      ? this.likes.some((like) => like.userId === userId && like.momentId === moment.id)
      : false;
    const isBookmarked = userId
      ? this.bookmarks.some(
          (bookmark) => bookmark.userId === userId && bookmark.momentId === moment.id
        )
      : false;
    const isReposted = userId
      ? this.reposts.some((repost) => repost.userId === userId && repost.momentId === moment.id)
      : false;

    const newMoment = {
      ...moment,
      post: {
        ...moment.post,
        isLiked,
        isBookmarked,
        isReposted,
      },
    };

    return newMoment;
  }

  public async create(userId: User['id'], data: CreatePostDto) {
    try {
      const post = {
        user_id: userId,
        ...data,
      };
      const posts = await this.supabaseService.insert('posts', post);
      if (posts.length === 0) return null;
      return posts[0];
    } catch (error) {
      this.logger.error(error, {
        context: 'PostService',
        location: 'create',
      });
      return null;
    }
  }

  public async like(userId: User['id'], momentId: Post['id']) {
    const moment = this.moments.find((moment) => moment.id === momentId);
    if (!moment) throw new NotFoundException('Moment not found');

    const like = this.likes.find((like) => like.userId === userId && like.momentId === momentId);
    if (like) throw new ConflictException('Already liked');

    const likeRecord = {
      id: Auth.generateId('uuid'),
      userId,
      momentId,
      createdAt: new Date(),
    };

    this.likes.push(likeRecord);
    return likeRecord;
  }

  public async unlike(userId: User['id'], momentId: Post['id']) {
    const moment = this.moments.find((moment) => moment.id === momentId);
    if (!moment) throw new NotFoundException('Moment not found');

    const like = this.likes.find((like) => like.userId === userId && like.momentId === momentId);
    if (!like) throw new NotFoundException('You have not liked this moment');

    this.likes = this.likes.filter((l) => l.id !== like.id);
  }

  public async bookmark(userId: User['id'], momentId: Post['id']) {
    const moment = this.moments.find((moment) => moment.id === momentId);
    if (!moment) throw new NotFoundException('Moment not found');

    const bookmark = this.bookmarks.find(
      (bookmark) => bookmark.userId === userId && bookmark.momentId === momentId
    );
    if (bookmark) throw new ConflictException('Already bookmarked');

    const bookmarkRecord = {
      id: Auth.generateId('uuid'),
      userId,
      momentId,
      createdAt: new Date(),
    };

    this.bookmarks.push(bookmarkRecord);
    return bookmarkRecord;
  }

  public async unbookmark(userId: User['id'], momentId: Post['id']) {
    const moment = this.moments.find((moment) => moment.id === momentId);
    if (!moment) throw new NotFoundException('Moment not found');

    const bookmark = this.bookmarks.find(
      (bookmark) => bookmark.userId === userId && bookmark.momentId === momentId
    );
    if (!bookmark) throw new NotFoundException('You have not bookmarked this moment');

    this.bookmarks = this.bookmarks.filter((b) => b.id !== bookmark.id);
  }

  public async repost(
    subject: {
      user: User['id'];
      moment: Post['id'];
    },
    data: RepostDto
  ) {
    const moment = this.moments.find((moment) => moment.id === subject.moment);
    if (!moment) throw new NotFoundException('Moment not found');

    const repost = this.reposts.find(
      (repost) => repost.userId === subject.user && repost.momentId === subject.moment
    );
    if (repost) throw new ConflictException('Already reposted');

    const repostRecord = {
      id: Auth.generateId('uuid'),
      userId: subject.user,
      momentId: subject.moment,
      comment: data.comment ?? null,
      audience: data.audience,
      createdAt: new Date(),
    };

    this.reposts.push(repostRecord);
    return repostRecord;
  }

  private async parseAttachments(attachments: Post['attachments']) {
    if (!attachments || attachments.length === 0) return null;

    // TEMPORARY
    const isMockData = this.configService.get<boolean>('MOCK_DATA', false);
    // TEMPORARY
    try {
      // const imageAttachments = attachments.filter((att) => att.type === 'image');
      // const videoAttachments = attachments.filter((att) => att.type === 'video');
      // Uncomment above lines to use the original logic

      // TEMPORARY
      // If MOCK_DATA is true, handle HTTP URLs directly
      if (isMockData) {
        const parsedAttachments = attachments
          .map((attachment) => {
            // Check if the ID is an HTTP URL
            if (attachment.id.startsWith('http')) {
              // For HTTP URLs, determine aspect ratio from the URL or use default logic
              let aspectRatio: '1:1' | '4:5' | '1.91:1' = '1:1';

              // Try to determine aspect ratio from URL patterns or use random for demo
              if (attachment.id.includes('4096x4096') || Math.random() < 0.6) {
                aspectRatio = '4:5';
              } else if (Math.random() < 0.3) {
                aspectRatio = '1.91:1';
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
        imageAttachments.length > 0
          ? this.cloudinaryService.getResources(
              imageAttachments.map((att) => att.id),
              'image'
            )
          : Promise.resolve({ resources: [] }),
        videoAttachments.length > 0
          ? this.cloudinaryService.getResources(
              videoAttachments.map((att) => att.id),
              'video'
            )
          : Promise.resolve({ resources: [] }),
      ]);

      const resourceMap = new Map();
      [...imageResources.resources, ...videoResources.resources].forEach((resource) => {
        resourceMap.set(resource.public_id, resource);
      });

      const parsedAttachments = attachments.map((attachment) => {
        // TEMPORARY
        // Skip HTTP URLs if we're not in mock mode (they were handled above)
        if (attachment.id.startsWith('http') && !isMockData) {
          return null;
        }
        // TEMPORARY

        const resource = resourceMap.get(attachment.id);

        if (!resource) {
          this.logger.warn(`Resource not found: ${attachment.id} (${attachment.type})`, {
            context: 'PostService',
            location: 'parseAttachments',
          });
          return null;
        }

        const ratio = resource.width / resource.height;
        let aspectRatio: '1:1' | '4:5' | '1.91:1' = '1:1';
        if (ratio < 1) aspectRatio = '4:5';
        if (ratio > 1) aspectRatio = '1.91:1';

        return {
          id: resource.public_id,
          type: attachment.type,
          aspectRatio,
        };
      });

      const validAttachments = parsedAttachments.filter((attachment) => attachment !== null);
      return validAttachments.length > 0 ? validAttachments : null;
    } catch (error) {
      this.logger.error('Failed to parse attachments', {
        context: 'PostService',
        location: 'parseAttachments',
      });
      return null;
    }
  }
}
