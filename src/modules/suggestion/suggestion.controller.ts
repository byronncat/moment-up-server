import type { JwtPayload } from 'jwt-library';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { PeopleDiscoveryService } from './people-discovery.service';
import { TrendingService } from './trending.service';
import { AccessToken } from '../../common/decorators';
import { AccessTokenGuard } from '../../common/guards';
import { GetTrendingDto, TrendingReportDto } from './dto';

@Controller({
  path: 'suggestion',
  version: '1',
})
export class SuggestionController {
  constructor(
    private readonly peopleDiscoveryService: PeopleDiscoveryService,
    private readonly trendingService: TrendingService
  ) {}

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getUserSuggestions(@AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    return {
      users: await this.peopleDiscoveryService.getUser(userId),
    };
  }

  @Get('popular')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getPopularProfiles(@AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    return {
      users: await this.peopleDiscoveryService.getPopular(userId),
    };
  }

  @Get('trending')
  @HttpCode(HttpStatus.OK)
  async getHashtagSuggestions(@Query(ValidationPipe) { limit }: GetTrendingDto) {
    return { topics: await this.trendingService.getTrending(limit) };
  }

  @Post('trending/report')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async reportTrendingTopic(
    @Body(ValidationPipe) trendingReportDto: TrendingReportDto,
    @AccessToken() token: JwtPayload
  ) {
    const userId = token?.sub || '';
    await this.trendingService.reportTrendingTopic(trendingReportDto, userId);
    return {
      message: 'Report submitted successfully',
    };
  }
}
