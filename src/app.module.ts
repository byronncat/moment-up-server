import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { AuthModule } from './modules';
import { RequestLogger } from './common/interceptors';
import { environment, winstonTransports } from './core';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: winstonTransports,
    }),
    ConfigModule.forRoot({
      load: [environment.load],
      validationSchema: environment.schema,
    }),
    AuthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLogger,
    },
  ],
})
export class AppModule {}
