import type { Request, Response } from 'express';
import type { JwtPayload } from 'jwt-library';
import type { GoogleUser } from 'passport-library';
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
import { AccessToken } from 'src/common/decorators';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { ConfigService } from '@nestjs/config';
import { Cookie } from 'src/common/constants';
import { AuthService } from './auth.service';
import {
  LoginDto,
  IdentityDto,
  RegisterDto,
  ChangePasswordDto,
  VerifyDto,
  SwitchAccountDto,
} from './dto';
import { GoogleOAuthGuard } from './guards';
import { AccessTokenGuard } from 'src/common/guards';
import { SocialAuthError } from 'src/common/constants';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Get('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Session() session: ExpressSession) {
    return {
      accessToken: await this.authService.refresh(session),
    };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@Session() session: ExpressSession, @AccessToken() accessToken?: JwtPayload) {
    return { user: await this.authService.currentUser(session, accessToken) };
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
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

  @Post('switch-account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async switchAccount(
    @Body(ValidationPipe) switchAccountDto: SwitchAccountDto,
    @Session() session: ExpressSession
  ) {
    return await this.authService.switchAccount(switchAccountDto, session);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return { user: await this.authService.register(registerDto) };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async logout(@Session() session: ExpressSession) {
    this.authService.logout(session);
  }

  @Get('csrf')
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Req() request: AuthRequest, @Session() session: ExpressSession) {
    session.cookie.maxAge = Cookie.MaxAge.DEFAULT;
    const csrfToken = request.csrfToken();
    return { csrfToken };
  }

  @Post('send-otp-email')
  @HttpCode(HttpStatus.OK)
  async sendOtpEmail(
    @Body(ValidationPipe) identityDto: IdentityDto,
    @Session() session: ExpressSession
  ) {
    await this.authService.sendOtpEmail(identityDto, session);
    return {
      message: 'OTP sent to your email successfully.',
    };
  }

  @Post('recover-password')
  @HttpCode(HttpStatus.OK)
  async recoverPassword(
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
    @Session() session: ExpressSession
  ) {
    await this.authService.recoverPassword(changePasswordDto, session);
    return {
      message: 'Password changed successfully.',
    };
  }

  @Get('google')
  @HttpCode(HttpStatus.FOUND)
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {
    // This route initiates the Google OAuth flow
    // The actual redirect is handled by the GoogleOAuthGuard
  }

  @Get('google/callback')
  @HttpCode(HttpStatus.FOUND)
  @UseGuards(GoogleOAuthGuard)
  async googleAuthCallback(
    @Req() req: GoogleAuthRequest,
    @Res() res: Response,
    @Session() session: ExpressSession
  ) {
    const clientUrl = this.configService.get('http.allowedOrigin');
    try {
      const result = await this.authService.googleLogin(req.user, session);
      res.redirect(`${clientUrl}/auth/success?token=${result.accessToken}`);
    } catch (error) {
      let errorCode = SocialAuthError.AUTHENTICATION_FAILED;
      if (error.message === 'Account is blocked') errorCode = SocialAuthError.ACCOUNT_BLOCKED;

      res.redirect(`${clientUrl}/auth/error?code=${errorCode}`);
    }
  }

  @Post('google/add-account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async addGoogleAccount(
    @AccessToken() accessToken: JwtPayload,
    @Session() session: ExpressSession
  ) {
    const user = await this.authService.currentUser(session, accessToken);
    return { user };
  }
}
