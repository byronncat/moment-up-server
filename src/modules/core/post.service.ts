import { mockMoments } from 'src/__mocks__/moment';
import type { PaginationPayload, MomentPayload } from 'api';
import type { Bookmark, MomentLike, Post, Repost, User } from 'schema';

import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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
    private readonly supabaseService: SupabaseService,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  public async getMoments(
    type: 'home' | 'explore' | 'user',
    userId: User['id'],
    dto: PaginationDto | ExploreDto | ProfileMomentDto
  ): Promise<PaginationPayload<MomentPayload>> {
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
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const momentSlice = this.moments.slice(startIndex, endIndex);

    const syncedMoments = momentSlice.map((moment) => {
      const isLiked = this.likes.some(
        (like) => like.userId === userId && like.momentId === moment.id
      );
      const isBookmarked = this.bookmarks.some(
        (bookmark) => bookmark.userId === userId && bookmark.momentId === moment.id
      );
      const isReposted = this.reposts.some(
        (repost) => repost.userId === userId && repost.momentId === moment.id
      );

      return {
        ...moment,
        post: {
          ...moment.post,
          isLiked,
          isBookmarked,
          isReposted,
        },
      };
    });

    const pagination: PaginationPayload<MomentPayload> = {
      total: this.moments.length,
      page,
      limit,
      hasNextPage: page < Math.ceil(this.moments.length / limit),
      items: syncedMoments,
    };
    return pagination;
  }

  private async geExploreMoments(userId: User['id'], { page, limit, type }: ExploreDto) {
    let filteredMoments = this.moments;

    if (type === 'media') {
      filteredMoments = this.moments.filter(
        (moment) => moment.post.files && moment.post.files.length > 0
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const momentSlice = filteredMoments.slice(startIndex, endIndex);

    const syncedMoments = momentSlice.map((moment) => {
      const isLiked = this.likes.some(
        (like) => like.userId === userId && like.momentId === moment.id
      );
      const isBookmarked = this.bookmarks.some(
        (bookmark) => bookmark.userId === userId && bookmark.momentId === moment.id
      );
      const isReposted = this.reposts.some(
        (repost) => repost.userId === userId && repost.momentId === moment.id
      );

      return {
        ...moment,
        post: {
          ...moment.post,
          isLiked,
          isBookmarked,
          isReposted,
        },
      };
    });

    const pagination: PaginationPayload<MomentPayload> = {
      total: filteredMoments.length,
      page,
      limit,
      hasNextPage: page < Math.ceil(filteredMoments.length / limit),
      items: syncedMoments,
    };

    return pagination;
  }

  private async getUserMoments(userId: User['id'], { page, limit, filter }: ProfileMomentDto) {
    // Get total count of user's posts
    const totalCount = await this.supabaseService.count('posts', {
      where: { user_id: userId },
    });

    // Get paginated posts
    const posts = await this.supabaseService.select<Post>('posts', {
      where: { user_id: userId },
      orderBy: {
        column: 'last_modified',
        ascending: false,
      },
      limit,
      offset: (page - 1) * limit,
    });

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
      posts.map(async (post) => {
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

    const pagination: PaginationPayload<MomentPayload> = {
      total: totalCount,
      page,
      limit,
      hasNextPage: page < Math.ceil(totalCount / limit),
      items: momentItems,
    };

    return pagination;
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

    try {
      const imageAttachments = attachments.filter((att) => att.type === 'image');
      const videoAttachments = attachments.filter((att) => att.type === 'video');

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
