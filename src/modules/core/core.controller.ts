import { Controller, HttpCode, HttpStatus, Get, Query, ParseIntPipe } from '@nestjs/common';
import { CoreService } from './core.service';

@Controller({
  path: 'moments',
  version: '1',
})
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getMoments(@Query('page', ParseIntPipe) page: number) {
    return this.coreService.getMoments(page);
  }
}
