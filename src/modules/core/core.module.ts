import { Module } from '@nestjs/common';
import { CoreController } from './core.controller';
import { MomentService } from './moment.service';
import { FeedService } from './feed.service';
import { UserService } from '../user/user.service';

@Module({
  controllers: [CoreController],
  providers: [MomentService, FeedService, UserService],
})
export class CoreModule {}
