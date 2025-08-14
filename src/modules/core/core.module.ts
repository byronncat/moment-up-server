import { Module } from '@nestjs/common';
import { MomentController } from './moment.controller';
import { StoryController } from './story.controller';
import { MomentService } from './moment.service';
import { StoryService } from './story.service';
import { UserService } from '../user/user.service';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  controllers: [MomentController, StoryController, CommentController],
  providers: [MomentService, StoryService, UserService, CommentService],
})
export class CoreModule {}
