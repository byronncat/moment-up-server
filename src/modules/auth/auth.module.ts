import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('email.host'),
          port: configService.get<number>('email.port'),
          secure: configService.get<boolean>('email.secure'),
          auth: {
            user: configService.get<string>('email.username'),
            pass: configService.get<string>('email.password'),
          },
        },
        defaults: {
          from: `MomentUp <${configService.get<string>('email.username')}>`,
        },
        template: {
          dir: path.join(process.cwd(), 'src/common/views/templates'),
          adapter: new HandlebarsAdapter({
            eq: (a: any, b: any) => a === b,
          }),
          options: {
            strict: true,
          },
        },
        options: {
          partials: {
            dir: path.join(process.cwd(), 'src/common/views/partials'),
            options: {
              strict: true,
            },
          },
        },
        /*
         * Strict mode for Handlebars templates
         * true = Throws an error if a partial is not found
         * false = Ignores the error and continues
         */
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
