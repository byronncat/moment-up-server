import { Module } from '@nestjs/common';
import { SuggestionController } from './suggestion.controller';
import { UserService } from '../user/user.service';
import { SuggestionService } from './suggestion.service';

@Module({
  controllers: [SuggestionController],
  providers: [SuggestionService, UserService],
  exports: [SuggestionService],
})
export class SuggestionModule {}
