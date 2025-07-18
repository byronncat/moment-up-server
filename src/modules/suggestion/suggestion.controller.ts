import type { JwtPayload } from 'library';

import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { SuggestionService } from './suggestion.service';
import { AccessToken } from '../../common/decorators';
import { AccessTokenGuard } from '../../common/guards';
import { ReportDto } from './dto';

@Controller({
  path: 'suggestion',
  version: '1',
})
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {}

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getUserSuggestions(@AccessToken() accessToken: JwtPayload) {
    const { sub: userId } = accessToken;
    return await this.suggestionService.getUser(userId);
  }

  @Get('trending')
  @HttpCode(HttpStatus.OK)
  async getHashtagSuggestions() {
    return await this.suggestionService.getTrending();
  }

  @Post('trending/report')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async reportTrendingTopic(
    @Body(ValidationPipe) reportDto: ReportDto,
    @AccessToken() accessToken: JwtPayload
  ) {
    const { sub: userId } = accessToken;
    await this.suggestionService.reportTrendingTopic(reportDto, userId);
    return {
      message: 'Report submitted successfully',
    };
  }
}
