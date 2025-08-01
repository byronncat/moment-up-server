import { mockSuggestedUsers, mockTrendingTopics } from 'src/__mocks__/suggestion';
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ReportDto } from './dto';

@Injectable()
export class SuggestionService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  public async getUser(userId: string) {
    this.logger.silly(userId);
    return mockSuggestedUsers;
  }

  public async getTrending() {
    return mockTrendingTopics;
  }

  public async reportTrendingTopic(reportDto: ReportDto, userId: string) {
    this.logger.silly(`${reportDto.topicId} reported by ${userId}`);
  }
}
