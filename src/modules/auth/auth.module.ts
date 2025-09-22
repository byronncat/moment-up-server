import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { HbsService } from './hbs.service';
import { GoogleStrategy } from './strategies';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as path from 'path';

@Module({
  imports: [
    UserModule,
    PassportModule,
    MailerModule.forRootAsync({
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
  providers: [AuthService, HbsService, GoogleStrategy],
})
export class AuthModule {}
