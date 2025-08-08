import { Module } from '@nestjs/common';
import { MomentController } from './moment.controller';
import { StoryController } from './story.controller';
import { MomentService } from './moment.service';
import { StoryService } from './story.service';
import { UserService } from '../user/user.service';

@Module({
  controllers: [MomentController, StoryController],
  providers: [MomentService, StoryService, UserService],
})
export class CoreModule {}
