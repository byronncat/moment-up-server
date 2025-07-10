import type { Request } from 'express';
import type { Session as ExpressSession } from 'express-session';

type AuthRequest = Request & {
  session: ExpressSession;
  csrfToken(): string;
};

import { Controller, Post, Body, HttpCode, HttpStatus, Session, Get, Req } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { AuthService } from './auth.service';
import { LoginDto, IdentityDto, RegisterDto, ChangePasswordDto } from './dto';

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

  @Post('recover-password')
  @HttpCode(HttpStatus.OK)
  recoverPassword(
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
    @Session() session: ExpressSession
  ) {
    return this.authService.recoverPassword(changePasswordDto, session);
  }
}
