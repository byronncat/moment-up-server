import type { ExpressSession } from 'express-session';
import type { JwtPayload } from 'jwt-library';
import type { GoogleUser } from 'passport-library';
import type { User } from 'schema';
import type { AccountDto } from 'api';

type EmailTemplate = 'otp' | 'verify' | 'welcome';

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
import { MailerService } from '@nestjs-modules/mailer';
import { UserService } from '../user/user.service';
import { Auth } from 'src/common/helpers';

import { HbsService } from './hbs.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Otp } from 'src/common/utilities';
import {
  LoginDto,
  IdentityDto,
  RegisterDto,
  ChangePasswordDto,
  VerifyDto,
  SwitchAccountDto,
} from './dto';
import { TOKEN_ID_LENGTH, Url, Cookie, AccountExist } from 'src/common/constants';

const OTP_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const VERIFICATION_TOKEN_MAX_AGE = '30m';
const REFRESH_TOKEN_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year
const ACCESS_TOKEN_MAX_AGE = '2h';

const Message = {
  NotAuthenticated: 'User not authenticated',
  Account: {
    Blocked: 'Account is blocked',
    NotVerified: 'Email not verified',
    NotFound: 'Account not found, the account may have been deleted',
  },
  Login: {
    Success: 'Login successful',
    InvalidCredentials: 'Invalid credentials',
  },
  Register: {
    Success: 'Register successful',
    UsernameConflict: 'Username already taken',
    EmailConflict: 'User with this email already exists',
    Failed: 'Failed to create user account',
  },
  Verify: {
    SendEmail: 'Email not verified, a new verification email has been sent',
    Success: 'Email verified',
    InvalidToken: 'Invalid verification token, the link may be corrupted or malformed',
    Failed: 'Email verification failed, please try again later',
    SendFailed: 'Failed to send verification email',
  },
  RecoverPassword: {
    Success: 'Password recovered',
    Mismatch: 'Passwords do not match',
    Expired: 'OTP expired, please request a new one',
    Failed: 'Failed to recover password',
  },
};

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
      const account = await this.userService.getById(userId, {
        select: 'id, verified, blocked',
      });
      if (account) {
        if (account.blocked) throw new ForbiddenException(Message.Account.Blocked);
        if (!account.verified) throw new ForbiddenException(Message.Verify.SendEmail);

        const newAccessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
        session.user.jti = newAccessToken.jti;
        return newAccessToken.value;
      }
    }
    this.clearAuthState(session);
    throw new UnauthorizedException(Message.NotAuthenticated);
  }

  public async currentUser(session: ExpressSession, accessToken?: JwtPayload) {
    const userId = accessToken?.sub || session.user?.sub;
    if (!userId) throw new UnauthorizedException(Message.NotAuthenticated);

    const account = await this.userService.getById(userId, {
      select: 'id, username, display_name, email, avatar',
    });
    if (!account) throw new UnauthorizedException(Message.NotAuthenticated);

    const payload: AccountDto = {
      id: account.id,
      username: account.username,
      displayName: account.display_name,
      avatar: account.avatar,
    };
    return payload;
  }

  public async login(data: LoginDto, session: ExpressSession) {
    const account = await this.userService.getById(data.identity, {
      select: 'id, username, display_name, email, avatar, password, blocked, verified, deleted_at',
    });

    if (!account) throw new UnauthorizedException(Message.Login.InvalidCredentials);
    if (account.blocked) throw new ForbiddenException(Message.Account.Blocked);
    if (
      account.deleted_at ||
      !account.password ||
      !(await Auth.compare(data.password, account.password))
    )
      throw new UnauthorizedException(Message.Login.InvalidCredentials);
    if (!account.verified) {
      await this.sendVerificationEmail(account.email);
      throw new UnauthorizedException(Message.Verify.SendEmail);
    }

    const accessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
    session.user = { sub: account.id, jti: accessToken.jti };
    session.cookie.maxAge = REFRESH_TOKEN_MAX_AGE;

    const payload: AccountDto = {
      id: account.id,
      username: account.username,
      displayName: account.display_name,
      avatar: account.avatar,
    };

    return {
      accessToken: accessToken.value,
      user: payload,
    };
  }

  public async register(data: RegisterDto) {
    const status = await this.userService.isAccountExist(data.email, data.username);

    if (status !== AccountExist.NONE) {
      if (status === AccountExist.EMAIL)
        throw new ConflictException(Message.Register.EmailConflict);
      if (status === AccountExist.USERNAME)
        throw new ConflictException(Message.Register.UsernameConflict);
    }
    const hashedPassword = await Auth.hash(data.password, this.saltRounds);

    const newUser = await this.userService.addCredentialUser({
      username: data.username,
      email: data.email,
      password: hashedPassword,
    });
    if (!newUser) throw new InternalServerErrorException(Message.Register.Failed);

    await this.sendVerificationEmail(data.email);

    const payload: AccountDto = {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.display_name,
      avatar: newUser.avatar,
    };
    return payload;
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
    if (!payload || !payload.sub) {
      return this.hbsService.renderSuccessTemplate('failure', {
        ...baseContext,
        errorMessage: Message.Verify.InvalidToken,
      });
    }

    const account = await this.userService.getById(payload.sub);
    if (!account) {
      return this.hbsService.renderSuccessTemplate('failure', {
        ...baseContext,
        errorMessage: Message.Account.NotFound,
      });
    }

    const user = await this.userService.verifyEmail(account.id);
    if (!user) {
      return this.hbsService.renderSuccessTemplate('failure', {
        ...baseContext,
        errorMessage: Message.Verify.Failed,
      });
    }

    await this.sendWelcomeEmail(user.email, user.username);
    return this.hbsService.renderSuccessTemplate('success', baseContext);
  }

  public async sendOtpEmail(data: IdentityDto, session: ExpressSession) {
    const account = await this.userService.getById(data.identity, {
      select: 'id, email, password',
    });
    if (account && account.password) {
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
      throw new UnauthorizedException(Message.RecoverPassword.Mismatch);

    const { otp } = session;
    if (!otp || !Otp.verify(session, data.otp, 'password-reset'))
      throw new UnauthorizedException(Message.RecoverPassword.Expired);

    const account = await this.userService.getById(otp.uid, {
      select: 'id, password',
    });
    if (!account) throw new NotFoundException(Message.Account.NotFound);

    const hashedPassword = await Auth.hash(data.newPassword, this.saltRounds);
    const changedSuccess = await this.userService.updatePassword(account.id, hashedPassword);
    if (!changedSuccess) throw new InternalServerErrorException(Message.RecoverPassword.Failed);

    Otp.clear(session);
  }

  public async googleLogin(googleUser: GoogleUser, session: ExpressSession) {
    try {
      let account = await this.userService.getById(googleUser.email, {
        select: 'id, username, display_name, email, avatar, blocked, verified',
      });

      if (account) {
        if (account.blocked) throw new ForbiddenException(Message.Account.Blocked);
        if (!account.verified) this.userService.verifyEmail(account.id);
      } else {
        account = await this.userService.addGoogleUser(googleUser);
        if (!account) throw new InternalServerErrorException(Message.Register.Failed);
        await this.sendWelcomeEmail(account.email, account.username);
      }

      const accessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
      session.user = { sub: account.id, jti: accessToken.jti };
      session.cookie.maxAge = REFRESH_TOKEN_MAX_AGE;

      const payload: AccountDto = {
        id: account.id,
        username: account.username,
        displayName: account.display_name,
        avatar: account.avatar,
      };
      return {
        accessToken: accessToken.value,
        user: payload,
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
    const account = await this.userService.getById(data.accountId, {
      select: 'id, username, display_name, email, avatar, blocked, verified',
    });
    if (!account) throw new NotFoundException(Message.Account.NotFound);
    if (account.deleted_at) throw new NotFoundException(Message.Login.InvalidCredentials);
    if (account.blocked) throw new ForbiddenException(Message.Account.Blocked);
    if (!account.verified) throw new UnauthorizedException(Message.Verify.SendEmail);

    const accessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
    session.user = { sub: account.id, jti: accessToken.jti };
    session.cookie.maxAge = REFRESH_TOKEN_MAX_AGE;

    const payload: AccountDto = {
      id: account.id,
      username: account.username,
      displayName: account.display_name,
      avatar: account.avatar,
    };
    return {
      accessToken: accessToken.value,
      user: payload,
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
      throw new InternalServerErrorException(Message.Verify.SendFailed);
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
