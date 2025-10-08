import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { CoreModule } from '../core/core.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [UserModule, CoreModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
