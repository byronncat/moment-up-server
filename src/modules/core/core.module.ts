import { Module } from '@nestjs/common';
import { MomentController } from './moment.controller';
import { StoryController } from './story.controller';
import { CommentController } from './comment.controller';
import { MomentService } from './moment.service';
import { StoryService } from './story.service';
import { CommentService } from './comment.service';
import { UserService } from '../user/user.service';

@Module({
  controllers: [MomentController, StoryController, CommentController],
  providers: [MomentService, StoryService, UserService, CommentService],
})
export class CoreModule {}
