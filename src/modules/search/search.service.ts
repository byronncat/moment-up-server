import { mockSearches } from 'src/__mocks__/search';
import { mockMoments } from 'src/__mocks__/moment';
import type { AccountPayload, HashtagPayload, MomentPayload, PaginationPayload } from 'api';
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

export interface MediaSearchData extends MomentPayload {
  type: SearchItemType.MEDIA;
}

export type SearchPayload =
  | UserSearchData
  | QuerySearchData
  | HashtagSearchData
  | MomentData
  | MediaSearchData;

export type SearchHistoryPayload = Exclude<SearchPayload, MomentData | MediaSearchData>;

// === Service ===

import { Injectable } from '@nestjs/common';
import { SearchDto } from './dto';

@Injectable()
export class SearchService {
  private searchHistory: SearchHistoryPayload[] = mockSearches;

  public async search(searchData: SearchDto) {
    const { query, type, order, page, limit } = searchData;

    const postData: SearchPayload[] = mockMoments.map((moment) => ({
      type: SearchItemType.POST,
      ...moment,
    }));

    const mediaData: SearchPayload[] = mockMoments
      .filter((moment) => moment.post?.files && moment.post.files.length > 0)
      .map((moment) => ({
        type: SearchItemType.MEDIA,
        ...moment,
      }));

    let allData: SearchPayload[] = [
      ...(mockSearches as SearchPayload[]),
      ...postData,
      ...mediaData,
    ];

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
          case SearchItemType.MEDIA:
            return (
              ((item as any).user?.username?.toLowerCase().includes(searchTerm) ||
                (item as any).user?.displayName?.toLowerCase().includes(searchTerm) ||
                (item as any).post?.text?.toLowerCase().includes(searchTerm)) &&
              (item as any).post?.files?.length > 0
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
        media: SearchItemType.MEDIA,
      };

      const allowedTypes = type.split('&').map((t) => t.trim());
      const searchItemTypes = allowedTypes
        .map((t) => typeMapping[t])
        .filter((t) => t !== undefined);

      if (searchItemTypes.length > 0) {
        allData = allData.filter((item) => searchItemTypes.includes(item.type));
      }
    }

    if (order) {
      allData = this.sortSearchResults(allData, order);
    }

    let result: PaginationPayload<SearchPayload>;
    if (type && type.includes('&')) {
      const postData = allData.filter((item) => item.type === SearchItemType.POST);
      const totalPosts = postData.length;

      // For multi-type searches: hasNextPage is true if there are more posts after page 1
      const hasNextPage = page === 1 ? totalPosts > limit : totalPosts > (page - 1) * limit;

      result = {
        page,
        total: allData.length,
        limit,
        hasNextPage,
        items: this.paginateByCategory(allData, type, page, limit),
      };
    } else {
      result = {
        page,
        limit,
        total: allData.length,
        hasNextPage: allData.length > page * limit,
        items: allData.slice((page - 1) * limit, page * limit),
      };
    }

    return result;
  }

  public async getHistory(userId: string, limit: number) {
    const limitedData: SearchHistoryPayload[] = this.searchHistory.slice(0, limit);
    return limitedData;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async clearHistory(userId: string) {
    // In a real application, this would clear the search history from the database.
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  public async removeHistoryItem(userId: string, itemId: string) {
    this.searchHistory = this.searchHistory.filter((item) => item.id !== itemId);
  }

  private sortSearchResults(data: SearchPayload[], order: string): SearchPayload[] {
    if (order === 'newest') {
      return data.sort((a, b) => {
        const getDate = (item: SearchPayload) => {
          // For posts and media, use post.updatedAt, fallback to createdAt if available
          if (item.type === SearchItemType.POST || item.type === SearchItemType.MEDIA) {
            const moment = item as MomentData | MediaSearchData;
            return moment.post?.updatedAt ? new Date(moment.post.updatedAt).getTime() : 0;
          }
          // For other types, keep current order (return same timestamp)
          return 0;
        };

        const dateB = getDate(b);
        const dateA = getDate(a);

        // If both have dates, sort by date (newest first)
        if (dateA && dateB) return dateB - dateA;
        // If only one has a date, prioritize the one with date
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        // If neither has dates, keep current order
        return 0;
      });
    }

    if (order === 'most_popular') {
      return data.sort((a, b) => {
        const getPopularityScore = (item: SearchPayload) => {
          switch (item.type) {
            case SearchItemType.POST:
            case SearchItemType.MEDIA:
              const moment = item as MomentData | MediaSearchData;
              return moment.post?.likes || 0;
            case SearchItemType.HASHTAG:
              const hashtag = item as HashtagSearchData;
              return hashtag.count || 0;
            case SearchItemType.USER:
            case SearchItemType.QUERY:
            default:
              // Keep current position for users and queries
              return 0;
          }
        };

        const scoreB = getPopularityScore(b);
        const scoreA = getPopularityScore(a);

        // If both have scores, sort by score (highest first)
        if (scoreA && scoreB) return scoreB - scoreA;
        // If only one has a score, prioritize the one with score
        if (scoreA && !scoreB) return -1;
        if (!scoreA && scoreB) return 1;
        // If neither has scores, keep current order
        return 0;
      });
    }

    return data;
  }

  private paginateByCategory(
    data: SearchPayload[],
    type: string,
    page: number,
    limit: number
  ): SearchPayload[] {
    const typeMapping: Record<string, SearchItemType> = {
      user: SearchItemType.USER,
      post: SearchItemType.POST,
      hashtag: SearchItemType.HASHTAG,
      media: SearchItemType.MEDIA,
    };

    const allowedTypes = type.split('&').map((t) => t.trim());
    const searchItemTypes = allowedTypes.map((t) => typeMapping[t]).filter((t) => t !== undefined);

    const result: SearchPayload[] = [];

    if (page === 1) {
      // Page 1: Show limit items from each requested category
      const categoryOrder = [
        SearchItemType.USER,
        SearchItemType.HASHTAG,
        SearchItemType.POST,
        SearchItemType.MEDIA,
      ];

      categoryOrder.forEach((itemType) => {
        if (searchItemTypes.includes(itemType)) {
          const categoryData = data.filter((item) => item.type === itemType);
          const paginatedCategoryData = categoryData.slice(0, limit);
          result.push(...paginatedCategoryData);
        }
      });
    } else {
      // Page 2+: Show only posts (next pages of posts)
      const postData = data.filter((item) => item.type === SearchItemType.POST);
      const startIndex = (page - 2) * limit + limit; // Skip first page posts
      const endIndex = startIndex + limit;
      const paginatedPostData = postData.slice(startIndex, endIndex);
      result.push(...paginatedPostData);
    }

    return result;
  }
}
