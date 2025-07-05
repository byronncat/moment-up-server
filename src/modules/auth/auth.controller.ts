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
import { LoginDto, RegisterDto } from './dto';
import { Cookie } from 'src/common/decorators';
import { COOKIE_NAME } from 'src/common/constants';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(
    @Session() session: ExpressSession,
    @Cookie(COOKIE_NAME.REFRESH) refreshToken: string,
    @Res({ passthrough: true }) response: Response
  ) {
    return this.authService.verify(session, refreshToken, response);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Session() session: ExpressSession,
    @Res({ passthrough: true }) response: Response
  ) {
    return this.authService.login(loginDto, session, response);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(
    @Body(ValidationPipe) registerDto: RegisterDto,
    @Session() session: ExpressSession,
    @Res({ passthrough: true }) response: Response
  ) {
    return this.authService.register(registerDto, session, response);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Session() session: ExpressSession, @Res({ passthrough: true }) response: Response) {
    return this.authService.logout(session, response);
  }

  @Get('csrf')
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() request: AuthRequest) {
    const csrfToken = request.csrfToken();
    return { csrfToken };
  }
}
