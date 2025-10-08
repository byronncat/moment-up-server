import type { AccountDto, FeedDto, PaginationDto } from 'api';

export interface UserSearchData extends AccountDto {
  type: SearchItemType.USER;
}

export interface QuerySearchData {
  query: string;
  type: SearchItemType.QUERY;
}

export interface PostSearchData extends FeedDto {
  type: SearchItemType.POST;
}

export interface MediaSearchData extends FeedDto {
  type: SearchItemType.MEDIA;
}

export type SearchPayload = UserSearchData | QuerySearchData | PostSearchData | MediaSearchData;

// === Service ===
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { SearchDto } from './dto';
import { PostService } from '../core/post.service';
import { SearchItemType } from 'src/common/constants';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class SearchService {
  constructor(
    private readonly userService: UserService,
    private readonly postService: PostService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  public async query(searchData: SearchDto) {
    const { query, filter, page, limit } = searchData;

    if (!filter || filter === 'user') {
      const result = await this.userService.search(query, page, limit);
      const items: UserSearchData[] = result.items.map((u: AccountDto) => ({
        type: SearchItemType.USER,
        ...u,
      }));
      return {
        page: result.page,
        limit: result.limit,
        hasNextPage: result.hasNextPage,
        items,
      } as PaginationDto<UserSearchData>;
    }

    if (filter === 'post' || filter === 'media') {
      const isMedia = filter === 'media';
      try {
        const result = await this.postService.search(query, page, limit, {
          mediaOnly: isMedia,
        });
        const items = result.items.map((f: FeedDto) => ({
          type: isMedia ? SearchItemType.MEDIA : SearchItemType.POST,
          ...f,
        }));
        return {
          page: result.page,
          limit: result.limit,
          hasNextPage: result.hasNextPage,
          items,
        } as PaginationDto<PostSearchData | MediaSearchData>;
      } catch (error: any) {
        this.logger.error(error.message, {
          location: 'query(post|media)',
          context: 'SearchService',
        });
        throw new InternalServerErrorException('Failed to search posts');
      }
    }
  }
}
