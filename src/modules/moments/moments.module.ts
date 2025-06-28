import { Module } from '@nestjs/common';
import { MomentsService } from './moments.service';
import { MomentsController } from './moments.controller';

@Module({
  controllers: [MomentsController],
  providers: [MomentsService],
})
export class MomentsModule {}
