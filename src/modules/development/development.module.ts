import { Module } from '@nestjs/common';
import { DevelopmentController } from './development.controller';
import { DevelopmentService } from './development.service';
import { TrendingService } from '../suggestion/trending.service';

@Module({
  controllers: [DevelopmentController],
  providers: [DevelopmentService, TrendingService],
})
export class DevelopmentModule {}
