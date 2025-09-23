import { Module } from '@nestjs/common';
import { SuggestionModule } from '../suggestion/suggestion.module';
import { DevelopmentController } from './development.controller';
import { DevelopmentService } from './development.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [SuggestionModule, UserModule],
  controllers: [DevelopmentController],
  providers: [DevelopmentService],
})
export class DevelopmentModule {}
