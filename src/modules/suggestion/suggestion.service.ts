import { mockSuggestedUsers, mockTrendingTopics } from 'src/__mocks__/suggestion';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SuggestionService {
  // TODO: Implement suggestion methods
  // - getUserSuggestions(userId)
  // - getHashtagSuggestions(query)
  // - getFriendSuggestions(userId)
  // - getContentSuggestions(userId)

  public async getUser(userId: string) {
    console.log('Fetching user suggestions for:', userId);
    return mockSuggestedUsers;
  }

  public async getTrending() {
    return mockTrendingTopics;
  }
}
