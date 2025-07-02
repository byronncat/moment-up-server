import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { AuthModule } from './modules';
import { RequestLogger } from './common/interceptors';
import { environment, winstonTransports } from './core';

console.log(process.env.JWT_SECRET); // Ensure JWT_SECRET is set

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: winstonTransports,
    }),
    ConfigModule.forRoot({
      load: [environment.load],
      validationSchema: environment.schema,
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
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLogger,
    },
  ],
})
export class AppModule {}
