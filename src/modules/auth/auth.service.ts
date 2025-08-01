import type { ExpressSession } from 'express-session';
import type { JwtPayload, GoogleUser } from 'library';
import type { User } from 'schema';

type EmailTemplate = 'otp' | 'verify' | 'welcome';

// === Service ===

import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Inject,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { MailerService } from '@nestjs-modules/mailer';

import { Auth } from 'src/common/helpers';
import { HbsService } from './hbs.service';
import { Otp } from 'src/common/utilities';
import {
  LoginDto,
  IdentityDto,
  RegisterDto,
  ChangePasswordDto,
  VerifyDto,
  SwitchAccountDto,
} from './dto';
import { UserService } from '../user/user.service';
import { TOKEN_ID_LENGTH, Url, Cookie } from 'src/common/constants';

const OTP_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const VERIFICATION_TOKEN_MAX_AGE = '30m';
const REFRESH_TOKEN_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year
const ACCESS_TOKEN_MAX_AGE = '2h';

@Injectable()
export class AuthService {
  private readonly saltRounds: number = this.configService.get('security.hashSaltRounds')!;
  private readonly jwtSecret: string = this.configService.get('security.jwtSecret')!;
  private readonly baseUrl: string = this.configService.get('app.baseUrl')!;
  private readonly clientUrl: string = this.configService.get('http.allowedOrigin')!;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly mailService: MailerService,
    private readonly hbsService: HbsService
  ) {}

  public async refresh(session: ExpressSession) {
    if (session.user) {
      const userId = session.user.sub;
      const account = await this.userService.getAccountById(userId);
      if (account) {
        const newAccessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
        session.user.jti = newAccessToken.jti;
        return newAccessToken.value;
      }
    }
    this.clearAuthState(session);
    throw new UnauthorizedException('User not authenticated');
  }

  public async currentUser(session: ExpressSession, accessToken?: JwtPayload) {
    const userId = accessToken?.sub || session.user?.sub;
    const account = await this.userService.getAccountById(userId);
    if (!account) throw new UnauthorizedException('User not authenticated');

    return account;
  }

  public async login(data: LoginDto, session: ExpressSession) {
    const account = await this.userService.getById(data.identity);

    if (!account) throw new UnauthorizedException('Invalid credentials');
    if (account.blocked) throw new ForbiddenException('Account is blocked');
    if (!account.verified) {
      await this.sendVerificationEmail(account.email);
      throw new UnauthorizedException(
        'Email not verified. A new verification email has been sent.'
      );
    }
    if (!account.password || !(await Auth.compare(data.password, account.password)))
      throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
    session.user = { sub: account.id, jti: accessToken.jti };
    session.cookie.maxAge = REFRESH_TOKEN_MAX_AGE;

    return {
      accessToken: accessToken.value,
      user: this.userService.parseToAccountPayload(account),
    };
  }

  public async register(data: RegisterDto) {
    const existingUser = await this.userService.getAccountById(data.email);
    if (existingUser) throw new ConflictException('User with this email already exists');

    const existingUsername = await this.userService.getAccountById(data.username);
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashedPassword = await Auth.hash(data.password, this.saltRounds);

    const newUser = await this.userService.addCredentialUser({
      username: data.username,
      email: data.email,
      password: hashedPassword,
    });
    if (!newUser) throw new InternalServerErrorException('Failed to create user account');

    await this.sendVerificationEmail(data.email);

    return this.userService.parseToAccountPayload(newUser);
  }

  public logout(session: ExpressSession) {
    this.clearAuthState(session);
  }

  public async verify(data: VerifyDto) {
    const baseContext = {
      title: 'MomentUp',
      brandName: 'MomentUp',
      logoUrl: `/static/logo.svg`,
      clientHostUrl: this.clientUrl,
      contactUrl: Url.CONTACT,
    };

    const payload = await this.verifyJwtToken(data.token);
    if (!payload) {
      return this.hbsService.renderSuccessTemplate('failure', {
        ...baseContext,
        errorMessage: 'Invalid verification token. The link may be corrupted or malformed.',
      });
    }

    const account = await this.userService.getAccountById(payload.sub);
    if (!account) {
      return this.hbsService.renderSuccessTemplate('failure', {
        ...baseContext,
        errorMessage: 'User account not found. The account may have been deleted.',
      });
    }

    const user = await this.userService.verifyEmail(account.id);
    if (!user) {
      return this.hbsService.renderSuccessTemplate('failure', {
        ...baseContext,
        errorMessage: 'Email verification failed. Please try again later.',
      });
    }

    await this.sendWelcomeEmail(user.email, user.username);
    return this.hbsService.renderSuccessTemplate('success', baseContext);
  }

  public async sendOtpEmail(data: IdentityDto, session: ExpressSession) {
    const account = await this.userService.getAccountById(data.identity);
    if (account) {
      const otpConfig = {
        expirationTimeMs: OTP_MAX_AGE,
        purpose: 'password-reset' as const,
      };
      session.otp = Otp.create(account.id, otpConfig);

      const context = {
        otp: session.otp.code,
        expirationTime: '5 minutes', // OTP_MAX_AGE
      };
      await this.sendEmail(
        {
          to: account.email,
          subject: 'Password Reset Request | MomentUp',
          templateName: 'otp',
        },
        context
      );
    }
  }

  public async recoverPassword(data: ChangePasswordDto, session: ExpressSession) {
    if (data.newPassword !== data.confirmPassword)
      throw new UnauthorizedException('Passwords do not match');

    const { otp } = session;
    if (!otp || !Otp.verify(session, data.otp, 'password-reset'))
      throw new UnauthorizedException('OTP expired. Please request a new one.');

    const account = await this.userService.getAccountById(otp.uid);
    if (!account) throw new NotFoundException('User not found');

    const hashedPassword = await Auth.hash(data.newPassword, this.saltRounds);
    const user = await this.userService.updatePassword(account.id, hashedPassword);
    if (!user) throw new InternalServerErrorException('Failed to update password');

    Otp.clear(session);
  }

  public async googleLogin(googleUser: GoogleUser, session: ExpressSession) {
    try {
      let account = await this.userService.getById(googleUser.googleId);
      if (!account) account = await this.userService.getById(googleUser.email);

      if (account) {
        if (account.blocked) throw new ForbiddenException('Account is blocked');
      } else {
        account = await this.userService.addGoogleUser(googleUser);
        if (!account) throw new InternalServerErrorException('Failed to create user account');
        await this.sendWelcomeEmail(account.email, account.username);
      }

      const accessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
      session.user = { sub: account.id, jti: accessToken.jti };
      session.cookie.maxAge = REFRESH_TOKEN_MAX_AGE;

      return {
        accessToken: accessToken.value,
        user: this.userService.parseToAccountPayload(account),
      };
    } catch (error) {
      this.logger.error(`Google login failed: ${error.message}`, {
        location: 'AuthService.googleLogin',
        context: 'OAuth',
      });
      throw error;
    }
  }

  public async switchAccount(data: SwitchAccountDto, session: ExpressSession) {
    const account = await this.userService.getById(data.accountId);
    if (!account) throw new NotFoundException('Account not found');
    if (account.blocked) throw new ForbiddenException('Account is blocked');

    const accessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
    session.user = { sub: account.id, jti: accessToken.jti };
    session.cookie.maxAge = REFRESH_TOKEN_MAX_AGE;

    return {
      accessToken: accessToken.value,
      user: this.userService.parseToAccountPayload(account),
    };
  }

  private async sendVerificationEmail(email: string) {
    try {
      const verificationToken = await this.createJwtToken(email, VERIFICATION_TOKEN_MAX_AGE);
      const verifyUrl = `${this.baseUrl}/v1/auth/verify?token=${verificationToken.value}`;
      await this.sendEmail(
        {
          to: email,
          subject: 'Verify your email | MomentUp',
          templateName: 'verify',
        },
        {
          verifyUrl,
          expirationTime: '30 minutes', // VERIFICATION_TOKEN_MAX_AGE
        }
      );
    } catch (error) {
      this.logger.error(error, {
        location: 'AuthService.sendVerificationEmail',
        context: 'Email',
      });
      throw new InternalServerErrorException('Failed to send verification email');
    }
  }

  private async sendWelcomeEmail(to: string, username: User['username']) {
    try {
      await this.sendEmail(
        {
          to,
          subject: 'Welcome to MomentUp',
          templateName: 'welcome',
        },
        {
          username,
          clientHostUrl: this.clientUrl,
        }
      );
    } catch (error) {
      this.logger.error(error, {
        location: 'AuthService.googleLogin',
        context: 'Welcome Email',
      });
    }
  }

  private async sendEmail(
    { to, subject, templateName }: { to: string; subject: string; templateName: EmailTemplate },
    context: Record<string, string | number>
  ) {
    try {
      await this.mailService.sendMail({
        to,
        subject,
        template: 'email',
        context: {
          title: 'MomentUp',
          brandName: 'MomentUp',
          logoUrl: Url.ICON,
          url: {
            contact: Url.CONTACT,
            github: Url.GITHUB,
            linkedin: Url.LINKEDIN,
            facebook: Url.FACEBOOK,
          },
          templateName,
          ...context,
        },
      });
    } catch (error) {
      this.logger.error(error.message, {
        location: 'AuthService.sendEmail',
        context: 'Email',
      });
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  private clearAuthState(session: ExpressSession) {
    session.user = undefined;
    session.cookie.maxAge = Cookie.MaxAge.DEFAULT;
  }

  /*
   * Using sync version of verifyJwtToken to avoid blocking the event loop.
   */

  private async verifyJwtToken(token: string) {
    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
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

  private async createJwtToken(userId: string, expiresIn: string, _jti?: string) {
    const jti = _jti || Auth.generateId('nanoid', { length: TOKEN_ID_LENGTH });
    const payload = { sub: userId, jti };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn,
    });
    return {
      jti,
      value: token,
    };
  }
}
