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
  ValidationPipe,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { DeleteHistoryDto, GetHistoryDto, SearchDto } from './dto';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';

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
  async getHistory(@AccessToken() accessToken: JwtPayload, @Query() getHistoryDto: GetHistoryDto) {
    const { sub: userId } = accessToken;
    return {
      history: await this.searchService.getSearchHistory(userId, getHistoryDto.limit),
    };
  }

  @Delete('history/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async clearHistory(@AccessToken() accessToken: JwtPayload) {
    const { sub: userId } = accessToken;
    await this.searchService.clearSearchHistory(userId);
  }

  @Delete('history/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async removeHistoryItem(
    @AccessToken() accessToken: JwtPayload,
    @Param(ValidationPipe) deleteHistoryDto: DeleteHistoryDto
  ) {
    const { sub: userId } = accessToken;
    await this.searchService.removeSearchHistoryItem(userId, deleteHistoryDto.itemId);
  }
}
