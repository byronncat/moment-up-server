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
import { LoginDto } from './dto';
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

  @Get('test-rate-limit')
  @HttpCode(HttpStatus.OK)
  testRateLimit(@Req() request: Request) {
    return { 
      message: 'Rate limit test successful', 
      timestamp: new Date().toISOString(),
      ip: request.ip || request.connection.remoteAddress
    };
  }
}
