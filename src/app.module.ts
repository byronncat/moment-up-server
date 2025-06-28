import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { UsersModule, AuthModule, MomentsModule, SupabaseModule } from './modules';
import { RequestLoggerMiddleware } from './common/middlewares';
import { environment, winstonTransports } from './configs';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: winstonTransports,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [environment],
    }),
    // UsersModule,
    AuthModule,
    // MomentsModule,
    // SupabaseModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*path');
  }
}
