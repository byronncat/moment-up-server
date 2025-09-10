import { Module } from '@nestjs/common';
import { MomentController } from './post.controller';
import { StoryController } from './story.controller';
import { CommentController } from './comment.controller';
import { PostService } from './post.service';
import { StoryService } from './story.service';
import { CommentService } from './comment.service';
import { UserService } from '../user/user.service';

@Module({
  controllers: [MomentController, StoryController, CommentController],
  providers: [PostService, StoryService, UserService, CommentService],
})
export class CoreModule {}
