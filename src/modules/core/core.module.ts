import { Module } from '@nestjs/common';
import { MomentController } from './moment.controller';
import { FeedController } from './feed.controller';
import { MomentService } from './moment.service';
import { FeedService } from './feed.service';
import { UserService } from '../user/user.service';

@Module({
  controllers: [MomentController, FeedController],
  providers: [MomentService, FeedService, UserService],
})
export class CoreModule {}
