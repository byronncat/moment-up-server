import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { DevelopmentService } from './development.service';
import { TrendingService } from '../suggestion/trending.service';

@Controller('dev')
export class DevelopmentController {
  constructor(
    private readonly developmentService: DevelopmentService,
    private readonly trendingService: TrendingService
  ) {}

  @Get('get-trending-from-context')
  @HttpCode(HttpStatus.OK)
  async getTrendingFromContext(@Query('postId') postId: string, @Query('context') context: string) {
    return await this.trendingService.processPostHashtags(postId, context);
  }

  @Post('generate-users')
  @HttpCode(HttpStatus.CREATED)
  async generateUsers(@Query('count') count?: string) {
    const userCount = count ? parseInt(count, 10) : 10;
    return await this.developmentService.generateUsers(userCount);
  }

  @Post('generate-follow-relationships')
  @HttpCode(HttpStatus.CREATED)
  async generateFollowRelationships(@Query('maxFollowsPerUser') maxFollowsPerUser?: string) {
    const maxFollows = maxFollowsPerUser ? parseInt(maxFollowsPerUser, 10) : 5;
    return await this.developmentService.generateFollowRelationships(maxFollows);
  }

  @Post('generate-posts')
  @HttpCode(HttpStatus.CREATED)
  async generatePosts(@Query('count') count?: string) {
    const postCount = count ? parseInt(count, 10) : 50;
    return await this.developmentService.generatePosts(postCount);
  }

  @Get('media-info')
  @HttpCode(HttpStatus.OK)
  async getMediaInfo(
    @Query('id') publicId?: string,
    @Query('ids') ids?: string,
    @Query('format') format?: string
  ) {
    if (format !== 'image' && format !== 'video' && format !== 'raw') {
      throw new BadRequestException('Invalid format');
    }
    return await this.developmentService.getMediaInfo(publicId, ids, format);
  }
}
