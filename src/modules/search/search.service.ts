import { mockSearches } from 'src/__mocks__/search';
import { mockMoments } from 'src/__mocks__/moment';
import type { AccountPayload, HashtagPayload, MomentPayload } from 'api';
import { SearchItemType } from 'src/common/constants';

export interface UserSearchData extends AccountPayload {
  type: SearchItemType.USER;
}

export interface QuerySearchData {
  id: string;
  type: SearchItemType.QUERY;
}

export interface HashtagSearchData extends HashtagPayload {
  type: SearchItemType.HASHTAG;
}

export interface MomentData extends MomentPayload {
  type: SearchItemType.POST;
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
  public async search(searchData: SearchData) {
    const { query, type, page, limit } = searchData;

    const momentData: SearchPayload[] = mockMoments.map((moment) => ({
      type: SearchItemType.POST,
      ...moment,
    }));

    let allData: SearchPayload[] = [...(mockSearches as SearchPayload[]), ...momentData];

    if (query) {
      allData = allData.filter((item) => {
        const searchTerm = query.toLowerCase();

        switch (item.type) {
          case SearchItemType.USER:
            return (
              item.username?.toLowerCase().includes(searchTerm) ||
              item.displayName?.toLowerCase().includes(searchTerm)
            );
          case SearchItemType.QUERY:
            return item.id.toLowerCase().includes(searchTerm);
          case SearchItemType.HASHTAG:
            return item.id.toLowerCase().includes(searchTerm);
          case SearchItemType.POST:
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
      const typeMapping: Record<string, SearchItemType> = {
        user: SearchItemType.USER,
        post: SearchItemType.POST,
        hashtag: SearchItemType.HASHTAG,
      };

      const allowedTypes = type.split('&').map((t) => t.trim());
      const searchItemTypes = allowedTypes
        .map((t) => typeMapping[t])
        .filter((t) => t !== undefined);

      if (searchItemTypes.length > 0) {
        allData = allData.filter((item) => searchItemTypes.includes(item.type));
      }
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = allData.slice(startIndex, endIndex);

    return paginatedData;
  }

  public async getSearchHistory(userId: string, limit: number) {
    const limitedData: Exclude<SearchPayload, MomentData>[] = mockSearches.slice(0, limit);
    return limitedData;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async clearSearchHistory(userId: string) {
    // In a real application, this would clear the search history from the database.
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async removeSearchHistoryItem(userId: string, itemId: string) {
    // In a real application, this would remove the specific item from the user's search history.
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}
