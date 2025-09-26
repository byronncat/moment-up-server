import { Module } from '@nestjs/common';
import { SuggestionController } from './suggestion.controller';
import { PeopleDiscoveryService } from './people-discovery.service';
import { TrendingService } from './trending.service';

@Module({
  controllers: [SuggestionController],
  providers: [PeopleDiscoveryService, TrendingService],
  exports: [TrendingService],
})
export class SuggestionModule {}
