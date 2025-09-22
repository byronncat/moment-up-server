import { createMockSearches } from 'src/__mocks__/search';
import { mockMoments } from 'src/__mocks__/moment';
import type { AccountDto, HashtagDto, MomentDto, PaginationDto } from 'api';
import { SearchItemType } from 'src/common/constants';

export interface UserSearchData extends AccountDto {
  type: SearchItemType.USER;
}

export interface QuerySearchData {
  id: string;
  type: SearchItemType.QUERY;
}

export interface HashtagSearchData extends HashtagDto {
  type: SearchItemType.HASHTAG;
}

export interface MomentData extends MomentDto {
  type: SearchItemType.POST;
}

export interface MediaSearchData extends MomentDto {
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
  // TODO: fix hashtag type
  private searchHistory: any[] = createMockSearches();

  public async search(searchData: SearchDto) {
    const { query, type, order, page, limit } = searchData;

    // Parse requested types
    const typeMapping: Record<string, SearchItemType> = {
      user: SearchItemType.USER,
      post: SearchItemType.POST,
      hashtag: SearchItemType.HASHTAG,
      media: SearchItemType.MEDIA,
    };

    const requestedTypes = type
      ? type
          .split('&')
          .map((t) => t.trim())
          .map((t) => typeMapping[t])
          .filter((t) => t !== undefined)
      : [
          SearchItemType.USER,
          SearchItemType.QUERY,
          SearchItemType.HASHTAG,
          SearchItemType.POST,
          SearchItemType.MEDIA,
        ];

    // Search directly from source data
    const results: SearchPayload[] = [];
    let totalCount = 0;

    // Search in mockSearches (users, queries, hashtags)
    if (
      requestedTypes.some((t) =>
        [SearchItemType.USER, SearchItemType.QUERY, SearchItemType.HASHTAG].includes(t)
      )
    ) {
      const searchResults = this.searchInMockSearches(query, requestedTypes);
      results.push(...searchResults);
      totalCount += searchResults.length;
    }

    // Search in moments (posts and media)
    if (requestedTypes.some((t) => [SearchItemType.POST, SearchItemType.MEDIA].includes(t))) {
      const momentResults = this.searchInMoments(query, requestedTypes);
      results.push(...momentResults);
      totalCount += momentResults.length;
    }

    // Sort results if needed
    const sortedResults = order ? this.sortSearchResults(results, order) : results;

    // Handle pagination
    let result: PaginationDto<SearchPayload>;
    if (type && type.includes('&')) {
      const postCount = sortedResults.filter((item) => item.type === SearchItemType.POST).length;
      const hasNextPage = page === 1 ? postCount > limit : postCount > (page - 1) * limit;

      result = {
        page,
        total: totalCount,
        limit,
        hasNextPage,
        items: this.paginateByCategory(sortedResults, type, page, limit),
      };
    } else {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      result = {
        page,
        limit,
        total: totalCount,
        hasNextPage: totalCount > endIndex,
        items: sortedResults.slice(startIndex, endIndex),
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

  private searchInMockSearches(
    query: string | undefined,
    requestedTypes: SearchItemType[]
  ): SearchPayload[] {
    const results: SearchPayload[] = [];
    const searchTerm = query?.toLowerCase();

    for (const item of this.searchHistory as SearchPayload[]) {
      // Skip if type not requested
      if (!requestedTypes.includes(item.type)) continue;

      // Skip if query doesn't match
      if (searchTerm && !this.matchesSearchTerm(item, searchTerm)) continue;

      results.push(item);
    }

    return results;
  }

  private searchInMoments(
    query: string | undefined,
    requestedTypes: SearchItemType[]
  ): SearchPayload[] {
    const results: SearchPayload[] = [];
    const searchTerm = query?.toLowerCase();
    const needsPosts = requestedTypes.includes(SearchItemType.POST);
    const needsMedia = requestedTypes.includes(SearchItemType.MEDIA);

    if (!needsPosts && !needsMedia) return results;

    for (const moment of mockMoments) {
      const hasMedia = moment.post?.files && moment.post.files.length > 0;

      // Check if this moment matches the requested types
      const matchesPost = needsPosts;
      const matchesMedia = needsMedia && hasMedia;

      if (!matchesPost && !matchesMedia) continue;

      // Check if query matches
      if (searchTerm && !this.momentMatchesSearchTerm(moment, searchTerm)) continue;

      // Add as POST type (media is handled through filtering)
      results.push({
        type: SearchItemType.POST,
        ...moment,
      });
    }

    return results;
  }

  private matchesSearchTerm(item: SearchPayload, searchTerm: string): boolean {
    switch (item.type) {
      case SearchItemType.USER:
        return (
          item.username?.toLowerCase().includes(searchTerm) ||
          (item.displayName !== null && item.displayName.toLowerCase().includes(searchTerm))
        );
      case SearchItemType.QUERY:
        return item.id.toLowerCase().includes(searchTerm);
      case SearchItemType.HASHTAG:
        return item.name.toLowerCase().includes(searchTerm);
      default:
        return false;
    }
  }

  private momentMatchesSearchTerm(moment: any, searchTerm: string): boolean {
    return (
      moment.user?.username?.toLowerCase().includes(searchTerm) ||
      moment.user?.displayName?.toLowerCase().includes(searchTerm) ||
      moment.post?.text?.toLowerCase().includes(searchTerm)
    );
  }

  private sortSearchResults(data: SearchPayload[], order: string): SearchPayload[] {
    if (order === 'newest') {
      return data.sort((a, b) => {
        const getDate = (item: SearchPayload) => {
          // For posts (including those treated as media), use post.updatedAt
          if (item.type === SearchItemType.POST) {
            const moment = item as MomentData;
            return moment.post?.lastModified ? new Date(moment.post.lastModified).getTime() : 0;
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
              const moment = item as MomentData;
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
          let categoryData: SearchPayload[];

          if (itemType === SearchItemType.MEDIA) {
            // For media type, filter posts that have media files
            categoryData = data.filter(
              (item) =>
                item.type === SearchItemType.POST &&
                (item as any).post?.files &&
                (item as any).post.files.length > 0
            );
          } else {
            categoryData = data.filter((item) => item.type === itemType);
          }

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
