import type { Response } from 'express';
import type { ExpressSession } from 'express-session';

import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { MailerService } from '@nestjs-modules/mailer';

import { authLib } from 'src/common/libraries';
import { LoginDto, RegisterDto } from './dto';
import { UserService } from '../user/user.service';
import { COOKIE_NAME, TOKEN_ID_LENGTH } from 'src/common/constants';

type JwtPayload = {
  sub: string;
  jti: string;
};

// interface EmailTemplateContext {
//   appName: string;
//   appUrl: string;
//   companyName: string;
//   year: number;
//   helpUrl?: string;
//   [key: string]: any;
// }

@Injectable()
export class AuthService {
  private readonly saltRounds: number = parseInt(
    this.configService.get('security.hashSaltRounds')!
  );
  private readonly jwtSecret: string = this.configService.get<string>('security.jwtSecret')!;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly mailService: MailerService
  ) {}

  public async verify(session: ExpressSession, refreshToken: string, response: Response) {
    const payload = this.verifyJwtToken(refreshToken);
    if (session.user && payload) {
      const userId = session.user.sub;
      const account = await this.userService.getUser(userId);
      if (account && session.user.jti === payload.jti) {
        const newRefreshToken = this.createJwtToken(account.id, '7d');
        const newAccessToken = this.createJwtToken(account.id, '15m', newRefreshToken.jti);

        session.user.jti = newRefreshToken.jti;
        response.cookie(COOKIE_NAME.REFRESH, newRefreshToken.value, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        return {
          accessToken: newAccessToken.value,
          user: account,
        };
      }
    }
    this.clearAuthState(session, response);
    throw new UnauthorizedException('User not authenticated');
  }

  public async login(data: LoginDto, session: ExpressSession, response: Response) {
    const account = await this.userService.getUser(data.identity);

    if (!account) throw new UnauthorizedException('Invalid credentials');
    if (account.blocked) throw new ForbiddenException('Account is blocked');
    if (!(await authLib.compare(data.password, account.password)))
      throw new UnauthorizedException('Invalid credentials');

    const refreshToken = this.createJwtToken(account.id, '7d');
    const accessToken = this.createJwtToken(account.id, '15m', refreshToken.jti);
    session.user = { sub: account.id, jti: refreshToken.jti };
    response.cookie(COOKIE_NAME.REFRESH, refreshToken.value, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: accessToken.value,
      user: account,
    };
  }

  public async register(data: RegisterDto, session: ExpressSession, response: Response) {
    const existingUser = await this.userService.getUser(data.email);
    if (existingUser) throw new ConflictException('User with this email already exists');

    const existingUsername = await this.userService.getUser(data.username);
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashedPassword = await authLib.hash(data.password, this.saltRounds);

    const newUser = await this.userService.addUser({
      username: data.username,
      email: data.email,
      password: hashedPassword,
    });

    const refreshToken = this.createJwtToken(newUser.id, '7d');
    const accessToken = this.createJwtToken(newUser.id, '15m', refreshToken.jti);
    session.user = { sub: newUser.id, jti: refreshToken.jti };
    response.cookie(COOKIE_NAME.REFRESH, refreshToken.value, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: accessToken.value,
      user: newUser,
    };
  }

  public async logout(session: ExpressSession, response: Response) {
    this.clearAuthState(session, response);
    return 'Logout successful';
  }

  // public async sendEmail(
  //   to: string,
  //   subject: string,
  //   templateName: string,
  //   context: EmailTemplateContext
  // ) {
  //   try {
  //     await this.mailService.sendMail({
  //       from: 'MomentUP <momentup@gmail.com>',
  //       to,
  //       subject,
  //       template: templateName,
  //       context: {
  //         ...this.getDefaultTemplateContext(),
  //         ...context,
  //       },
  //     });
  //     return 'Email sent successfully';
  //   } catch (error) {
  //     this.logger.error('Failed to send email', {
  //       location: 'AuthService.sendEmail',
  //       context: 'Email',
  //       error: error.message,
  //     });
  //     throw new Error('Failed to send email');
  //   }
  // }

  // public async sendPasswordResetEmail(to: string, userName: string, resetUrl: string) {
  //   const context: EmailTemplateContext = {
  //     ...this.getDefaultTemplateContext(),
  //     userName,
  //     resetUrl,
  //     expirationTime: '24 hours',
  //   };

  //   return this.sendEmail(to, 'Password Reset Request - MomentUP', 'password-reset', context);
  // }

  // public async sendGeneralEmail(
  //   to: string,
  //   subject: string,
  //   title: string,
  //   message: string,
  //   buttonUrl?: string,
  //   buttonText?: string
  // ) {
  //   const context: EmailTemplateContext = {
  //     ...this.getDefaultTemplateContext(),
  //     title,
  //     message,
  //     buttonUrl,
  //     buttonText,
  //   };

  //   return this.sendEmail(to, subject, 'general', context);
  // }

  // public async sendWelcomeEmail(to: string, userName: string) {
  //   const context: EmailTemplateContext = {
  //     ...this.getDefaultTemplateContext(),
  //     userName,
  //     buttonUrl: 'https://momentup.com/dashboard',
  //     buttonText: 'Get Started',
  //   };

  //   return this.sendEmail(to, 'Welcome to MomentUP!', 'welcome', context);
  // }

  // private getDefaultTemplateContext(): EmailTemplateContext {
  //   return {
  //     appName: 'MomentUP',
  //     appUrl: 'https://momentup.com',
  //     companyName: 'NCAT',
  //     year: new Date().getFullYear(),
  //     helpUrl: 'https://momentup.com/help',
  //   };
  // }

  private clearAuthState(session: ExpressSession, response: Response) {
    session.user = undefined;
    response.clearCookie(COOKIE_NAME.REFRESH);
  }

  private createJwtToken(userId: string, expiresIn: string, _jti?: string) {
    const jti = _jti || authLib.generateId('nanoid', { length: TOKEN_ID_LENGTH });
    const payload = { sub: userId, jti };
    const token = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn,
    });
    return {
      jti,
      value: token,
    };
  }

  private verifyJwtToken(token: string): JwtPayload | null {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.jwtSecret,
      });
      return payload;
    } catch (error) {
      this.logger.info(error, {
        location: 'AuthService.verifyJwtToken',
        context: 'JWT',
      });
      return null;
    }
  }

  // DO NOT REMOVE COMMENTED CODE
  // async signup(signupAuthDto: SignupAuthDto, req: Request) {
  //   const { data: existingUser, error: checkError } = await this.supabase
  //     .from('users')
  //     .select('email,username')
  //     .or(`email.eq.${signupAuthDto.email},username.eq.${signupAuthDto.username}`)
  //     .single();

  //   if (checkError && checkError.code !== 'PGRST116') {
  //     console.error(checkError);
  //     throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }

  //   if (existingUser) {
  //     if (existingUser.email === signupAuthDto.email)
  //       throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
  //     if (existingUser.username === signupAuthDto.username)
  //       throw new HttpException('Username already exists', HttpStatus.BAD_REQUEST);
  //   }

  //   const { data: createdUser, error } = await this.supabase
  //     .from('users')
  //     .insert({
  //       email: signupAuthDto.email,
  //       username: signupAuthDto.username,
  //       password_hash: await this.hashPassword(signupAuthDto.password),
  //     })
  //     .select('id')
  //     .single();

  //   if (error || !createdUser) {
  //     console.error(error);
  //     throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }

  //   req.session.user = { id: createdUser.id };
  //   return JSON.stringify('Signup successful');
  // }
}
