import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { PostController } from './post.controller';
import { StoryController } from './story.controller';
import { CommentController } from './comment.controller';
import { PostService } from './post.service';
import { StoryService } from './story.service';
import { CommentService } from './comment.service';

@Module({
  imports: [UserModule],
  controllers: [PostController, StoryController, CommentController],
  providers: [PostService, StoryService, CommentService],
})
export class CoreModule {}
