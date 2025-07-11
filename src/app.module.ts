import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule, CoreModule } from './modules';
import { RequestLogger } from './common/interceptors';
import { CsrfExceptionFilter } from './common/filters';
import { environment, createWinstonTransports } from './configurations';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
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
      load: [environment.load],
      validationSchema: environment.schema,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 10000,
          limit: 10,
        },
      ],
      errorMessage: 'Too many requests',
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('security.jwtSecret'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CoreModule,
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
      useClass: CsrfExceptionFilter,
    },
  ],
})
export class AppModule {}
