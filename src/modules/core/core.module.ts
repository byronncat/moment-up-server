import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { SuggestionModule } from '../suggestion/suggestion.module';
import { PostController } from './post.controller';
import { CommentController } from './comment.controller';
import { StoryController } from './story.controller';
import { PostService } from './post.service';
import { StoryService } from './story.service';
import { CommentService } from './comment.service';

@Module({
  imports: [UserModule, SuggestionModule],
  controllers: [PostController, CommentController, StoryController],
  providers: [PostService, StoryService, CommentService],
  exports: [PostService],
})
export class CoreModule {}
