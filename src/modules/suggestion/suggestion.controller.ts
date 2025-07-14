import type { JwtPayload } from 'library';

import { Controller, Get, UseGuards } from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { AccessToken } from '../../common/decorators';
import { AccessTokenGuard } from '../../common/guards';

@Controller({
  path: 'suggestion',
  version: '1',
})
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {}

  @Get('users')
  @UseGuards(AccessTokenGuard)
  async getUserSuggestions(@AccessToken() accessToken: JwtPayload) {
    const { sub: userId } = accessToken;
    return await this.suggestionService.getUser(userId);
  }

  @Get('trending')
  async getHashtagSuggestions() {
    return await this.suggestionService.getTrending();
  }
}
