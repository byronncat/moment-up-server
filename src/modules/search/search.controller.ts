import type { JwtPayload } from 'library';
import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { HistoryDto, SearchDto } from './dto';
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
    return this.searchService.search(searchDto);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getSearchHistory(@AccessToken() accessToken: JwtPayload, @Query() historyDto: HistoryDto) {
    const { sub: userId } = accessToken;
    const { limit } = historyDto;
    return this.searchService.getSearchHistory(userId, limit);
  }
}
