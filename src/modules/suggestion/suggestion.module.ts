import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { SuggestionController } from './suggestion.controller';
import { UserService } from '../user/user.service';
import { SuggestionService } from './suggestion.service';
import { AccessTokenMiddleware } from '../../common/middlewares';

@Module({
  controllers: [SuggestionController],
  providers: [SuggestionService, UserService],
  exports: [SuggestionService],
})
export class SuggestionModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessTokenMiddleware).forRoutes(
      {
        path: 'v1/suggestion/users',
        method: RequestMethod.GET,
      },
      {
        path: 'v1/suggestion/trending/report',
        method: RequestMethod.POST,
      }
    );
  }
}
