import type { JwtPayload } from 'jwt-library';
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
    return await this.searchService.search(searchDto);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getHistory(@AccessToken() token: JwtPayload, @Query() { limit }: GetHistoryDto) {
    const userId = token?.sub || '';
    return {
      history: await this.searchService.getHistory(userId, limit),
    };
  }

  @Delete('history/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async clearHistory(@AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    await this.searchService.clearHistory(userId);
  }

  @Delete('history/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async removeHistoryItem(@AccessToken() token: JwtPayload, @Param('id') id: string) {
    const userId = token?.sub || '';
    await this.searchService.removeHistoryItem(userId, id);
  }
}
