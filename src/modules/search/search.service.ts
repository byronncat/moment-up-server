import { mockSearches } from 'src/__mocks__/search';
import { mockMoments } from 'src/__mocks__/moment';
import type { User, Hashtag } from 'schema';
import type { MomentPayload, PaginationPayload } from 'api';
import { SearchType } from 'src/common/constants';

interface UserSearchData {
  id: User['id'];
  type: SearchType.USER;
  username: User['username'];
  displayName: User['displayName'];
  avatar?: User['avatar'];
}

interface QuerySearchData {
  id: string;
  type: SearchType.SEARCH;
}

interface HashtagSearchData {
  id: Hashtag['id'];
  type: SearchType.HASHTAG;
  count: number;
}

interface MomentData extends MomentPayload {
  type: SearchType.POST;
}

export type SearchPayload = UserSearchData | QuerySearchData | HashtagSearchData | MomentData;

// === Service ===

import { Injectable } from '@nestjs/common';

interface SearchData {
  query: string;
  type?: string;
  page: number;
  limit: number;
}

@Injectable()
export class SearchService {
  public async search(searchData: SearchData): Promise<PaginationPayload<SearchPayload>> {
    const { query, type, page, limit } = searchData;

    const momentData: SearchPayload[] = mockMoments.map((moment) => ({
      type: SearchType.POST,
      ...moment,
    }));

    let allData: SearchPayload[] = [...(mockSearches as SearchPayload[]), ...momentData];

    if (query) {
      allData = allData.filter((item) => {
        const searchTerm = query.toLowerCase();

        switch (item.type) {
          case SearchType.USER:
            return (
              item.username?.toLowerCase().includes(searchTerm) ||
              item.displayName?.toLowerCase().includes(searchTerm)
            );
          case SearchType.HASHTAG:
            return item.id.toLowerCase().includes(searchTerm);
          case SearchType.SEARCH:
            return item.id.toLowerCase().includes(searchTerm);
          case SearchType.POST:
            return (
              (item as any).user?.username?.toLowerCase().includes(searchTerm) ||
              (item as any).user?.displayName?.toLowerCase().includes(searchTerm) ||
              (item as any).post?.text?.toLowerCase().includes(searchTerm)
            );
          default:
            return false;
        }
      });
    }

    if (type) {
      const searchType = parseInt(type) as SearchType;
      allData = allData.filter((item) => item.type === searchType);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = allData.slice(startIndex, endIndex);

    return {
      total: allData.length,
      page,
      limit,
      data: paginatedData,
    };
  }

  public async getSearchHistory(
    userId: string,
    limit: number
  ): Promise<{
    history: SearchPayload[];
  }> {
    console.log(userId, limit);
    const limitedData = mockSearches.slice(0, limit) as SearchPayload[];
    return {
      history: limitedData,
    };
  }
}
