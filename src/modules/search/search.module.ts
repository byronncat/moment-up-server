import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { UserService } from '../user/user.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, UserService],
  exports: [SearchService],
})
export class SearchModule {}
