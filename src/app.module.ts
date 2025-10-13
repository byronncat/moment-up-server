import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  AuthModule,
  CoreModule,
  DatabaseModule,
  DevelopmentModule,
  NotificationModule,
  SearchModule,
  SuggestionModule,
  UserModule,
} from './modules';
import { RequestLogger } from './common/interceptors';
import { HttpExceptionFilter } from './common/filters';
import { createWinstonTransports, environment } from './configurations';
import { AccessTokenMiddleware } from './common/middlewares';
import { RateLimit } from './common/constants';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('nodeEnv');
        const isDevelopment = nodeEnv === 'development';

        return {
          transports: createWinstonTransports(isDevelopment),
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [environment.load],
      validationSchema: environment.schema,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: RateLimit.TTL,
          limit: RateLimit.LIMIT,
        },
      ],
    }),
    JwtModule.registerAsync({
      global: true,
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('security.jwtSecret'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CoreModule,
    UserModule,
    SuggestionModule,
    SearchModule,
    NotificationModule,
    DatabaseModule,
    DevelopmentModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLogger,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessTokenMiddleware).forRoutes('*');
  }
}
