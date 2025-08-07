import { mockMoments } from 'src/__mocks__/moment';
import type { PaginationPayload, MomentPayload } from 'api';
import type { Bookmark, Like, Moment, Repost, User } from 'schema';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto, RepostDto, ExploreDto, ProfileMomentDto } from './dto';
import { Auth } from 'src/common/helpers';

@Injectable()
export class MomentService {
  private moments = mockMoments;
  private likes: Like[] = [];
  private bookmarks: Bookmark[] = [];
  private reposts: Repost[] = [];

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

  public async geHometMoments(userId: User['id'], pageOptions: PaginationDto) {
    const startIndex = (pageOptions.page - 1) * pageOptions.limit;
    const endIndex = pageOptions.page * pageOptions.limit;
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
      page: pageOptions.page,
      limit: pageOptions.limit,
      hasNextPage: pageOptions.page < Math.ceil(this.moments.length / pageOptions.limit),
      items: syncedMoments,
    };
    return pagination;
  }

  private async geExploreMoments(userId: User['id'], exploreDto: ExploreDto) {
    let filteredMoments = this.moments;

    if (exploreDto.type === 'media') {
      filteredMoments = this.moments.filter(
        (moment) => moment.post.files && moment.post.files.length > 0
      );
    }

    const startIndex = (exploreDto.page - 1) * exploreDto.limit;
    const endIndex = exploreDto.page * exploreDto.limit;
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
      page: exploreDto.page,
      limit: exploreDto.limit,
      hasNextPage: exploreDto.page < Math.ceil(filteredMoments.length / exploreDto.limit),
      items: syncedMoments,
    };

    return pagination;
  }

  private async getUserMoments(userId: User['id'], profileMomentDto: ProfileMomentDto) {
    let filteredMoments = this.moments;

    if (profileMomentDto.filter === 'media') {
      filteredMoments = this.moments.filter(
        (moment) => moment.post.files && moment.post.files.length > 0
      );
    }

    const startIndex = (profileMomentDto.page - 1) * profileMomentDto.limit;
    const endIndex = profileMomentDto.page * profileMomentDto.limit;
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
      page: profileMomentDto.page,
      limit: profileMomentDto.limit,
      hasNextPage:
        profileMomentDto.page < Math.ceil(filteredMoments.length / profileMomentDto.limit),
      items: syncedMoments,
    };

    return pagination;
  }

  public async getById(userId: User['id'] | null, id: Moment['id']) {
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

  public async like(userId: User['id'], momentId: Moment['id']) {
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

  public async unlike(userId: User['id'], momentId: Moment['id']) {
    const moment = this.moments.find((moment) => moment.id === momentId);
    if (!moment) throw new NotFoundException('Moment not found');

    const like = this.likes.find((like) => like.userId === userId && like.momentId === momentId);
    if (!like) throw new NotFoundException('You have not liked this moment');

    this.likes = this.likes.filter((l) => l.id !== like.id);
  }

  public async bookmark(userId: User['id'], momentId: Moment['id']) {
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

  public async unbookmark(userId: User['id'], momentId: Moment['id']) {
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
      moment: Moment['id'];
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
}
