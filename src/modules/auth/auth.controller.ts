import type { Request } from 'express';
import type { GoogleUser } from 'library';
import type { Session as ExpressSession } from 'express-session';

interface AuthRequest extends Request {
  session: ExpressSession;
  csrfToken(): string;
}

interface GoogleAuthRequest extends Request {
  user: GoogleUser;
}

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Session,
  Get,
  Req,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto, IdentityDto, RegisterDto, ChangePasswordDto, VerifyDto } from './dto';
import { GoogleOAuthGuard } from './guards';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Get('authenticate')
  @HttpCode(HttpStatus.OK)
  async authenticate(
    @Session() session: ExpressSession,
    @Res({ passthrough: true }) resposne: Response
  ) {
    return await this.authService.authenticate(session, resposne);
  }

  @Get('verify')
  async verify(@Query() query: VerifyDto, @Res() resposne: Response) {
    const result = await this.authService.verify(query);
    resposne.status(result.statusCode);
    resposne.setHeader('Content-Type', 'text/html');
    resposne.send(result.html);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto, @Session() session: ExpressSession) {
    return await this.authService.login(loginDto, session);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Session() session: ExpressSession) {
    return await this.authService.logout(session);
  }

  @Get('csrf')
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() request: AuthRequest) {
    const csrfToken = request.csrfToken();
    return { csrfToken };
  }

  @Post('send-otp-email')
  @HttpCode(HttpStatus.OK)
  async sendOtpEmail(
    @Body(ValidationPipe) identityDto: IdentityDto,
    @Session() session: ExpressSession
  ) {
    return await this.authService.sendOtpEmail(identityDto, session);
  }

  @Post('recover-password')
  @HttpCode(HttpStatus.OK)
  async recoverPassword(
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
    @Session() session: ExpressSession
  ) {
    return await this.authService.recoverPassword(changePasswordDto, session);
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @HttpCode(HttpStatus.OK)
  async googleAuth() {
    // This route initiates the Google OAuth flow
    // The actual redirect is handled by the GoogleOAuthGuard
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @HttpCode(HttpStatus.OK)
  async googleAuthCallback(
    @Req() req: GoogleAuthRequest,
    @Session() session: ExpressSession,
    @Res() res: Response
  ) {
    const clientUrl = this.configService.get('http.allowedOrigin');
    try {
      const result = await this.authService.googleLogin(req.user, session);
      res.redirect(`${clientUrl}/auth/success?token=${result.accessToken}`);
    } catch (error) {
      res.redirect(`${clientUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
  }
}
