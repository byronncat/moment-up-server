import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { DevelopmentService } from './development.service';
import { SuggestionService } from '../suggestion/suggestion.service';

@Controller('dev')
export class DevelopmentController {
  constructor(
    private readonly developmentService: DevelopmentService,
    private readonly suggestionService: SuggestionService
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUsersFromDb() {
    return await this.developmentService.getUsersFromDb();
  }

  @Post('create-user')
  @HttpCode(HttpStatus.CREATED)
  async createUserInDb() {
    return await this.developmentService.createUserInDb();
  }

  @Get('get-trending-from-context')
  @HttpCode(HttpStatus.OK)
  async getTrendingFromContext(@Query('postId') postId: string, @Query('context') context: string) {
    return await this.suggestionService.processPostHashtags(postId, context);
  }
}
