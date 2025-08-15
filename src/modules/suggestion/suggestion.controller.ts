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
  async getUserSuggestions(@AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    return {
      users: await this.suggestionService.getUser(userId),
    };
  }

  @Get('popular')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getPopularProfiles(@AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    return {
      users: await this.suggestionService.getPopular(userId),
    };
  }

  @Get('trending')
  @HttpCode(HttpStatus.OK)
  async getHashtagSuggestions() {
    return { topics: await this.suggestionService.getTrending() };
  }

  @Post('trending/report')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async reportTrendingTopic(
    @Body(ValidationPipe) reportDto: ReportDto,
    @AccessToken() token: JwtPayload
  ) {
    const userId = token?.sub || '';
    await this.suggestionService.reportTrendingTopic(reportDto, userId);
    return {
      message: 'Report submitted successfully',
    };
  }
}
