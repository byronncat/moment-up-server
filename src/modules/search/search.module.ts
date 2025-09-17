import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [UserModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
