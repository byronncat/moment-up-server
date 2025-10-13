import type { JwtSignOptions } from '@nestjs/jwt';
import type { AppSession, AppSessionData } from 'app-session';
import type { JwtPayload } from 'jwt-library';
import type { GoogleUser } from 'passport-library';
import type { User } from 'schema';
import type { AccountDto } from 'api';

type EmailTemplate = 'otp' | 'verify' | 'welcome';

import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
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
  ChangePasswordDto,
  IdentityDto,
  LoginDto,
  RegisterDto,
  SwitchAccountDto,
  VerifyDto,
} from './dto';
import { AccountExist, Cookie, TOKEN_ID_LENGTH, Url } from 'src/common/constants';

const OTP_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const VERIFICATION_TOKEN_MAX_AGE = '30m';
const REFRESH_TOKEN_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year
const ACCESS_TOKEN_MAX_AGE = '2h';

const ErrorMessage = {
  NotAuthenticated: 'You must be logged in to continue.',
  Account: {
    Blocked: 'This account has been blocked.',
    NotFound: 'Account not found. It may have been deleted.',
  },
  Login: {
    InvalidCredentials: 'Incorrect credentials.',
  },
  Register: {
    UsernameConflict: 'This username is already taken.',
    EmailConflict: 'An account with this email already exists.',
    Failed: 'Unable to create account. Please try again.',
  },
  Verify: {
    SendEmail: 'Email not verified. A new verification email has been sent.',
    InvalidToken: 'Invalid or corrupted verification link.',
    Failed: 'Email verification failed. Please try again.',
    SendFailed: 'Unable to send verification email.',
  },
  RecoverPassword: {
    Mismatch: 'Passwords do not match.',
    Expired: 'OTP has expired. Please request a new one.',
    Failed: 'Unable to reset password. Please try again.',
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

  public async refresh(session: AppSession) {
    if (session.user) {
      const userId = session.user.sub;
      const account = await this.userService.getById(userId, {
        select: 'id, username, display_name, email, avatar, verified, blocked',
      });
      if (account) {
        if (account.blocked) throw new ForbiddenException(ErrorMessage.Account.Blocked);
        if (!account.verified) throw new ForbiddenException(ErrorMessage.Verify.SendEmail);

        const newAccessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
        session.user.jti = newAccessToken.jti;

        const payload: AccountDto = {
          id: account.id,
          username: account.username,
          displayName: account.display_name,
          avatar: account.avatar,
        };
        return {
          accessToken: newAccessToken.value,
          user: payload,
        };
      }
    }
    this.clearAuthState(session);
    throw new UnauthorizedException(ErrorMessage.NotAuthenticated);
  }

  public async currentUser(accessToken?: JwtPayload) {
    if (!accessToken?.sub) throw new UnauthorizedException(ErrorMessage.NotAuthenticated);
    const account = await this.userService.getById(accessToken.sub, {
      select: 'id, username, display_name, email, avatar, verified, blocked',
    });
    if (!account) throw new UnauthorizedException(ErrorMessage.NotAuthenticated);

    const payload: AccountDto = {
      id: account.id,
      username: account.username,
      displayName: account.display_name,
      avatar: account.avatar,
    };
    return payload;
  }

  public async login(data: LoginDto, session: AppSession) {
    const account = await this.userService.getById(data.identity, {
      select: 'id, username, display_name, email, avatar, password, blocked, verified, deleted_at',
    });

    if (!account) throw new UnauthorizedException(ErrorMessage.Login.InvalidCredentials);
    if (account.blocked) throw new ForbiddenException(ErrorMessage.Account.Blocked);
    if (
      account.deleted_at ||
      !account.password ||
      !(await Auth.compare(data.password, account.password))
    )
      throw new UnauthorizedException(ErrorMessage.Login.InvalidCredentials);
    if (!account.verified) {
      await this.sendVerificationEmail(account.email);
      throw new UnauthorizedException(ErrorMessage.Verify.SendEmail);
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
        throw new ConflictException(ErrorMessage.Register.EmailConflict);
      throw new ConflictException(ErrorMessage.Register.UsernameConflict);
    }
    const hashedPassword = await Auth.hash(data.password, this.saltRounds);

    const newUser = await this.userService.addCredentialUser({
      username: data.username,
      email: data.email,
      password: hashedPassword,
    });
    if (!newUser) throw new InternalServerErrorException(ErrorMessage.Register.Failed);

    await this.sendVerificationEmail(data.email);

    const payload: AccountDto = {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.display_name,
      avatar: newUser.avatar,
    };
    return payload;
  }

  public logout(session: AppSession) {
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
    if (!payload?.sub) {
      return this.hbsService.renderSuccessTemplate('failure', {
        ...baseContext,
        errorMessage: ErrorMessage.Verify.InvalidToken,
      });
    }

    const user = await this.userService.verifyEmail(payload.sub);
    if (!user) {
      return this.hbsService.renderSuccessTemplate('failure', {
        ...baseContext,
        errorMessage: ErrorMessage.Verify.Failed,
      });
    }

    await this.sendWelcomeEmail(user.email, user.username);
    return this.hbsService.renderSuccessTemplate('success', baseContext);
  }

  public async sendOtpEmail(data: IdentityDto, session: AppSessionData) {
    const account = await this.userService.getById(data.identity, {
      select: 'id, email, password',
    });
    if (account?.password) {
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

  public async recoverPassword(data: ChangePasswordDto, session: AppSessionData) {
    if (data.newPassword !== data.confirmPassword)
      throw new UnauthorizedException(ErrorMessage.RecoverPassword.Mismatch);

    const { otp } = session;
    if (!otp || !Otp.verify(session, data.otp, 'password-reset'))
      throw new UnauthorizedException(ErrorMessage.RecoverPassword.Expired);

    const hashedPassword = await Auth.hash(data.newPassword, this.saltRounds);
    const changedSuccess = await this.userService.updatePassword(otp.uid, hashedPassword);
    if (!changedSuccess)
      throw new InternalServerErrorException(ErrorMessage.RecoverPassword.Failed);

    Otp.clear(session);
  }

  public async googleLogin(googleUser: GoogleUser, session: AppSession) {
    try {
      let account = await this.userService.getById(googleUser.email, {
        select: 'id, username, display_name, email, avatar, blocked, verified',
      });

      if (account) {
        if (account.blocked) throw new ForbiddenException(ErrorMessage.Account.Blocked);
        if (!account.verified) this.userService.verifyEmail(account.id);
      } else {
        account = await this.userService.addGoogleUser(googleUser);
        if (!account) throw new InternalServerErrorException(ErrorMessage.Register.Failed);
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
        location: 'googleLogin',
        context: 'OAuth',
      });
      throw error;
    }
  }

  public async switchAccount(data: SwitchAccountDto, session: AppSession) {
    const account = await this.userService.getById(data.accountId, {
      select: 'id, username, display_name, email, avatar, blocked, verified',
    });
    if (!account) throw new NotFoundException(ErrorMessage.Account.NotFound);
    if (account.deleted_at) throw new NotFoundException(ErrorMessage.Login.InvalidCredentials);
    if (account.blocked) throw new ForbiddenException(ErrorMessage.Account.Blocked);
    if (!account.verified) throw new UnauthorizedException(ErrorMessage.Verify.SendEmail);

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
        location: 'sendVerificationEmail',
        context: 'Email',
      });
      throw new InternalServerErrorException(ErrorMessage.Verify.SendFailed);
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
        location: 'sendWelcomeEmail',
        context: 'Email',
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
        location: 'sendEmail',
        context: 'Email',
      });
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  private clearAuthState(session: AppSession) {
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
        location: 'verifyJwtToken',
        context: 'JWT',
      });
      return null;
    }
  }

  private async createJwtToken(
    userId: string,
    expiresIn: NonNullable<JwtSignOptions['expiresIn']>,
    _jti?: string
  ) {
    const jti = _jti ?? Auth.generateId('nanoid', { length: TOKEN_ID_LENGTH });
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
