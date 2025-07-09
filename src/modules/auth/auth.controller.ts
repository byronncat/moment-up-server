import type { Response, Request } from 'express';
import type { Session as ExpressSession } from 'express-session';

type AuthRequest = Request & {
  session: ExpressSession;
  csrfToken(): string;
};

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Session,
  Res,
  Get,
  Req,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { AuthService } from './auth.service';
import { LoginDto, IdentityDto, RegisterDto, ChangePasswordDto } from './dto';

import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Session() session: ExpressSession) {
    return this.authService.verify(session);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(ValidationPipe) loginDto: LoginDto, @Session() session: ExpressSession) {
    return this.authService.login(loginDto, session);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Session() session: ExpressSession) {
    return this.authService.logout(session);
  }

  @Get('csrf')
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() request: AuthRequest) {
    const csrfToken = request.csrfToken();
    return { csrfToken };
  }

  @Post('send-otp-email')
  @HttpCode(HttpStatus.OK)
  sendOtpEmail(@Body(ValidationPipe) identityDto: IdentityDto, @Session() session: ExpressSession) {
    return this.authService.sendOtpEmail(identityDto, session);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
    @Session() session: ExpressSession
  ) {
    return this.authService.changePassword(changePasswordDto, session);
  }

  @Get('generate-email-template')
  @HttpCode(HttpStatus.OK)
  generateEmailTemplate(@Res() response: Response) {
    try {
      // Read the template file
      const templatePath = join(process.cwd(), 'src/common/templates/emails/general.hbs');
      const cssPath = join(process.cwd(), 'src/common/templates/emails/css/general.css');
      const template = readFileSync(templatePath, 'utf-8');
      const css = readFileSync(cssPath, 'utf-8');

      // Compile the template with Handlebars
      const compiledTemplate = Handlebars.compile(template);

      // Sample data for preview
      const data = {
        subject: 'Welcome to MomentUP',
        appName: 'MomentUP',
        title: 'Welcome to Our Community!',
        message:
          "Thank you for joining MomentUP. We're excited to have you on board! Get ready to share your amazing moments with the world.",
        buttonUrl: 'https://momentup.com/dashboard',
        buttonText: 'Get Started',
        year: new Date().getFullYear(),
        companyName: 'NCAT',
        helpUrl: 'https://momentup.com/help',
      };

      // Inject CSS directly into the template for browser preview
      const htmlWithInlineStyles = compiledTemplate(data).replace(
        '</head>',
        `<style>${css}</style></head>`
      );

      // Set content type and send the response
      response.header('Content-Type', 'text/html');
      response.send(htmlWithInlineStyles);
    } catch (error) {
      console.error(error);
      response.status(500).send('Error generating email template');
    }
  }
}
