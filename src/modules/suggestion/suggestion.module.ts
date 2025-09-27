import { Module } from '@nestjs/common';
import { SuggestionController } from './suggestion.controller';
import { PeopleDiscoveryService } from './people-discovery.service';
import { TrendingService } from './trending.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [SuggestionController],
  providers: [PeopleDiscoveryService, TrendingService],
  exports: [TrendingService],
})
export class SuggestionModule {}
