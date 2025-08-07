import type { JwtPayload } from 'library';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { GetHistoryDto, SearchDto } from './dto';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import { IdParamDto } from 'src/common/validators';

@Controller({
  path: 'search',
  version: '1',
})
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async search(@Query() searchDto: SearchDto) {
    return {
      items: await this.searchService.search(searchDto),
    };
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getHistory(
    @AccessToken() { sub: userId }: JwtPayload,
    @Query() getHistoryDto: GetHistoryDto
  ) {
    return {
      history: await this.searchService.getSearchHistory(userId, getHistoryDto.limit),
    };
  }

  @Delete('history/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async clearHistory(@AccessToken() { sub: userId }: JwtPayload) {
    await this.searchService.clearSearchHistory(userId);
  }

  @Delete('history/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async removeHistoryItem(@AccessToken() { sub: userId }: JwtPayload, @Param() { id }: IdParamDto) {
    await this.searchService.removeSearchHistoryItem(userId, id);
  }
}
