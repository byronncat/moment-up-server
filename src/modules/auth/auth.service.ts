import type { AppSession, AppSessionData } from 'app-session';
import type { JwtPayload } from 'jwt-library';
import type { GoogleUser } from 'passport-library';
import type { User } from 'schema';
import type { AccountDto } from 'api';

type EmailTemplate = 'otp' | 'verify' | 'welcome';

import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as brevo from '@getbrevo/brevo';
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
import { AccountExist, Cookie, ErrorCode, TOKEN_ID_LENGTH, Url } from 'src/common/constants';

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
  private readonly brevoApiInstance: brevo.TransactionalEmailsApi;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly hbsService: HbsService
  ) {
    const brevoApiKey = this.configService.get<string>('email.brevoApiKey');
    if (brevoApiKey) {
      const apiInstance = new brevo.TransactionalEmailsApi();
      apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);
      this.brevoApiInstance = apiInstance;
    }
  }

  public async refresh(session: AppSession) {
    if (session.user) {
      const userId = session.user.sub;
      const account = await this.userService.getById(
        userId,
        'id, username, display_name, email, avatar, verified, blocked'
      );

      if (account) {
        if (account.blocked) throw new ForbiddenException('This account has been blocked.');
        if (!account.verified) throw new ForbiddenException('Email is not verified.');

        const newAccessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
        session.user.jti = newAccessToken.jti;

        const user: AccountDto = {
          id: account.id,
          username: account.username,
          displayName: account.display_name,
          avatar: account.avatar,
        };
        return {
          accessToken: newAccessToken.value,
          user,
        };
      }
    }

    this.clearAuthState(session);
    throw new UnauthorizedException('You must be logged in to continue.');
  }

  public async currentUser(accessToken?: JwtPayload) {
    if (!accessToken?.sub) throw new UnauthorizedException('You must be logged in to continue.');
    const account = await this.userService.getById(
      accessToken.sub,
      'id, username, display_name, email, avatar, verified, blocked'
    );
    if (!account) throw new UnauthorizedException('You must be logged in to continue.');

    const user: AccountDto = {
      id: account.id,
      username: account.username,
      displayName: account.display_name,
      avatar: account.avatar,
    };
    return user;
  }

  public async login({ identity, password }: LoginDto, session: AppSession) {
    const account = await this.userService.getById(
      identity,
      'id, username, display_name, email, avatar, password, blocked, verified, deleted_at'
    );

    if (!account) throw new UnauthorizedException('Incorrect credentials.');
    if (account.blocked) throw new ForbiddenException('This account has been blocked.');
    if (
      account.deleted_at ||
      !account.password ||
      !(await Auth.compare(password, account.password))
    )
      throw new UnauthorizedException('Incorrect credentials.');
    if (!account.verified) {
      await this.sendVerificationEmail(account.email);
      throw new UnauthorizedException({
        message: 'Email is not verified.',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
        code: ErrorCode.EMAIL_NOT_VERIFIED,
      });
    }

    const accessToken = await this.createJwtToken(account.id, ACCESS_TOKEN_MAX_AGE);
    session.user = { sub: account.id, jti: accessToken.jti };
    session.cookie.maxAge = REFRESH_TOKEN_MAX_AGE;

    const user: AccountDto = {
      id: account.id,
      username: account.username,
      displayName: account.display_name,
      avatar: account.avatar,
    };

    return {
      accessToken: accessToken.value,
      user,
    };
  }

  public async register({ email, username, password }: RegisterDto) {
    const status = await this.userService.isAccountExist(email, username);

    if (status !== AccountExist.NONE) {
      if (status === AccountExist.EMAIL)
        throw new ConflictException('An account with this email already exists.');
      throw new ConflictException('This username is already taken.');
    }
    const hashedPassword = await Auth.hash(password, this.saltRounds);

    const newUser = await this.userService.addCredentialUser({
      username,
      email,
      password: hashedPassword,
    });
    if (!newUser)
      throw new InternalServerErrorException('Unable to create account. Please try again.');

    await this.sendVerificationEmail(email);

    const user: AccountDto = {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.display_name,
      avatar: newUser.avatar,
    };
    return user;
  }

  public logout(session: AppSession) {
    this.clearAuthState(session);
  }

  public async verify({ token }: VerifyDto) {
    const baseContext = {
      title: 'MomentUp',
      brandName: 'MomentUp',
      logoUrl: `/static/logo.svg`,
      clientHostUrl: this.clientUrl,
      contactUrl: Url.CONTACT,
    };

    const payload = await this.verifyJwtToken(token);
    if (!payload?.sub) {
      return this.hbsService.renderVerificationTemplate('failure', {
        ...baseContext,
        errorMessage: 'This verification link is invalid or has been tampered with.',
      });
    }

    const user = await this.userService.verifyEmail(payload.sub);
    if (!user) {
      return this.hbsService.renderVerificationTemplate('failure', {
        ...baseContext,
        errorMessage: "We couldn't verify your email. Please try again or request a new link.",
      });
    }

    await this.sendWelcomeEmail(user.email, user.username);
    return this.hbsService.renderVerificationTemplate('success', baseContext);
  }

  public async sendOtpEmail({ identity }: IdentityDto, session: AppSessionData) {
    const account = await this.userService.getById(identity, 'id, email, password');
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

  public async recoverPassword({ otp, newPassword }: ChangePasswordDto, session: AppSessionData) {
    if (!session.otp || !Otp.verify(session, otp, 'password-reset'))
      throw new ForbiddenException('OTP has expired. Please request a new one.');

    const hashedPassword = await Auth.hash(newPassword, this.saltRounds);
    const changedSuccess = await this.userService.updatePassword(session.otp.uid, hashedPassword);
    if (!changedSuccess)
      throw new InternalServerErrorException('Unable to reset password. Please try again.');

    Otp.clear(session);
  }

  public async googleLogin(googleUser: GoogleUser, session: AppSession) {
    try {
      let account = await this.userService.getById(
        googleUser.email,
        'id, username, display_name, email, avatar, blocked, verified'
      );

      if (account) {
        if (account.blocked) throw new ForbiddenException('This account has been blocked.');
        if (!account.verified) this.userService.verifyEmail(account.email);
      } else {
        account = await this.userService.addGoogleUser(googleUser);
        if (!account)
          throw new InternalServerErrorException('Unable to create account. Please try again.');
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
    const account = await this.userService.getById(
      data.accountId,
      'id, username, display_name, email, avatar, blocked, verified'
    );
    if (!account) throw new NotFoundException('Account not found. It may have been deleted.');
    if (account.deleted_at) throw new UnauthorizedException('Incorrect credentials.');
    if (account.blocked) throw new ForbiddenException('This account has been blocked.');
    if (!account.verified)
      throw new UnauthorizedException({
        message: 'This account email is not verified.',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
        code: ErrorCode.EMAIL_NOT_VERIFIED,
      });

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
      throw new InternalServerErrorException('Unable to send verification email.');
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

  // OLD SMTP EMAIL HANDLER (COMMENTED OUT - Now using Brevo)
  // private async sendEmail(
  //   { to, subject, templateName }: { to: string; subject: string; templateName: EmailTemplate },
  //   context: Record<string, string | number>
  // ) {
  //   try {
  //     await this.mailService.sendMail({
  //       to,
  //       subject,
  //       template: 'email',
  //       context: {
  //         title: 'MomentUp',
  //         brandName: 'MomentUp',
  //         logoUrl: Url.ICON,
  //         url: {
  //           contact: Url.CONTACT,
  //           github: Url.GITHUB,
  //           linkedin: Url.LINKEDIN,
  //           facebook: Url.FACEBOOK,
  //         },
  //         templateName,
  //         ...context,
  //       },
  //     });
  //   } catch (error) {
  //     this.logger.error(
  //       `${error.message} | Host: ${this.configService.get('email.host')}, Port: ${this.configService.get('email.port')}, Secure: ${this.configService.get('email.secure')}`,
  //       {
  //         location: 'sendEmail',
  //         context: 'Email',
  //       }
  //     );
  //     throw new InternalServerErrorException('Failed to send email');
  //   }
  // }

  /**
   * Send email using Brevo API
   */
  private async sendEmail(
    { to, subject, templateName }: { to: string; subject: string; templateName: EmailTemplate },
    context: Record<string, string | number>
  ) {
    try {
      // await this.mailService.sendMail({
      //   to,
      //   subject,
      //   template: 'email',
      //   context: {
      //     title: 'MomentUp',
      //     brandName: 'MomentUp',
      //     logoUrl: Url.ICON,
      //     url: {
      //       contact: Url.CONTACT,
      //       github: Url.GITHUB,
      //       linkedin: Url.LINKEDIN,
      //       facebook: Url.FACEBOOK,
      //     },
      //     templateName,
      //     ...context,
      //   },
      // });

      const htmlContent = this.hbsService.renderBrevoTemplate(templateName, {
        title: 'MomentUp',
        brandName: 'MomentUp',
        logoUrl: Url.ICON,
        url: {
          contact: Url.CONTACT,
          github: Url.GITHUB,
          linkedin: Url.LINKEDIN,
          facebook: Url.FACEBOOK,
        },
        ...context,
      });

      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = htmlContent;
      sendSmtpEmail.sender = {
        name: 'MomentUp',
        email: this.configService.get<string>('email.username') ?? 'noreply@momentup.com',
      };
      sendSmtpEmail.to = [{ email: to }];

      await this.brevoApiInstance.sendTransacEmail(sendSmtpEmail);

      this.logger.info('Email sent successfully via Brevo', {
        location: 'sendEmail',
        context: 'Email',
        to,
        subject,
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
