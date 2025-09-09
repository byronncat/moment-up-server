import { Module } from '@nestjs/common';
import { DevelopmentController } from './development.controller';
import { DevelopmentService } from './development.service';
import { SuggestionService } from '../suggestion/suggestion.service';

@Module({
  controllers: [DevelopmentController],
  providers: [DevelopmentService, SuggestionService],
})
export class DevelopmentModule {}
