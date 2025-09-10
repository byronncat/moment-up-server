import { Module } from '@nestjs/common';
import { SuggestionController } from './suggestion.controller';
import { PeopleDiscoveryService } from './people-discovery.service';
import { TrendingService } from './trending.service';
import { UserService } from '../user/user.service';

@Module({
  controllers: [SuggestionController],
  providers: [PeopleDiscoveryService, TrendingService, UserService],
})
export class SuggestionModule {}
