import { Module } from '@nestjs/common';
import { SuggestionController } from './suggestion.controller';
import { SuggestionService } from './suggestion.service';
import { UserService } from '../user/user.service';

@Module({
  controllers: [SuggestionController],
  providers: [SuggestionService, UserService],
})
export class SuggestionModule {}
