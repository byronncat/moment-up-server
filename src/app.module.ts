import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AuthModule } from './modules';
import { RequestLoggerMiddleware } from './common/middlewares';
import { environment, winstonTransports } from './configs';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: winstonTransports,
    }),
    ConfigModule.forRoot({
      load: [environment],
    }),
    AuthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*path');
  }
}
