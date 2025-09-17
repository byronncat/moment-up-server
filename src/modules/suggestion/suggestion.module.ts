import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { SuggestionController } from './suggestion.controller';
import { PeopleDiscoveryService } from './people-discovery.service';
import { TrendingService } from './trending.service';

@Module({
  imports: [UserModule],
  controllers: [SuggestionController],
  providers: [PeopleDiscoveryService, TrendingService],
  exports: [TrendingService],
})
export class SuggestionModule {}
