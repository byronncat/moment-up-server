import { Module } from '@nestjs/common';
import { SuggestionModule } from '../suggestion/suggestion.module';
import { DevelopmentController } from './development.controller';
import { DevelopmentService } from './development.service';

@Module({
  imports: [SuggestionModule],
  controllers: [DevelopmentController],
  providers: [DevelopmentService],
})
export class DevelopmentModule {}
