import type { ExpressSession } from 'express-session';

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

import { authLib } from 'src/common/libraries';
import { Otp } from 'src/common/utilities';
import { LoginDto, IdentityDto, RegisterDto, ChangePasswordDto } from './dto';
import { UserService } from '../user/user.service';
import { TOKEN_ID_LENGTH } from 'src/common/constants';

type EmailTemplate = 'otp' | 'verify' | 'welcome';
type JwtPayload = {
  sub: string;
  jti: string;
};

const MAX_AGE = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly saltRounds: number = this.configService.get('security.hashSaltRounds')!;
  private readonly jwtSecret: string = this.configService.get<string>('security.jwtSecret')!;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly mailService: MailerService
  ) {}

  public async verify(session: ExpressSession) {
    if (session.user) {
      const userId = session.user.sub;
      const account = await this.userService.getById(userId);
      if (account) {
        const newAccessToken = this.createJwtToken(account.id, '15m');

        session.user.jti = newAccessToken.jti;
        return {
          accessToken: newAccessToken.value,
          user: account,
        };
      }
    }
    this.clearAuthState(session);
    throw new UnauthorizedException('User not authenticated');
  }

  public async login(data: LoginDto, session: ExpressSession) {
    const account = await this.userService.getById(data.identity);

    if (!account) throw new UnauthorizedException('Invalid credentials');
    if (account.blocked) throw new ForbiddenException('Account is blocked');
    if (!(await authLib.compare(data.password, account.password)))
      throw new UnauthorizedException('Invalid credentials');

    const accessToken = this.createJwtToken(account.id, '15m');
    session.user = { sub: account.id, jti: accessToken.jti };
    session.cookie.maxAge = MAX_AGE;

    return {
      accessToken: accessToken.value,
      user: account,
    };
  }

  public async register(data: RegisterDto) {
    const existingUser = await this.userService.getById(data.email);
    if (existingUser) throw new ConflictException('User with this email already exists');

    const existingUsername = await this.userService.getById(data.username);
    if (existingUsername) throw new ConflictException('Username already taken');

    const hashedPassword = await authLib.hash(data.password, this.saltRounds);

    await this.userService.add({
      username: data.username,
      email: data.email,
      password: hashedPassword,
    });

    return 'User registered successfully';
  }

  public async logout(session: ExpressSession) {
    this.clearAuthState(session);
    return 'Logout successful';
  }

  public async sendOtpEmail(data: IdentityDto, session: ExpressSession) {
    const account = await this.userService.getById(data.identity);
    if (account) {
      const otpConfig = {
        expirationTimeMs: 5 * 60 * 1000,
        purpose: 'password-reset' as const,
      };
      session.otp = Otp.create(account.id, otpConfig);

      const context = {
        otp: session.otp.code,
        expirationTime: '5 minutes',
      };
      await this.sendEmail(
        {
          to: account.email,
          subject: 'Password Reset Request | MomentUp',
          templateName: 'otp',
        },
        context
      );
      await this.sendEmail(
        {
          to: account.email,
          subject: 'Welcome to MomentUp',
          templateName: 'welcome',
        },
        {
          username: account.username,
          clientHostUrl: 'https://momment-up-client.vercel.app',
        }
      );
      await this.sendEmail(
        {
          to: account.email,
          subject: 'Verify your email | MomentUp',
          templateName: 'verify',
        },
        {
          verifyUrl: 'https://momment-up-client.vercel.app/verify',
          expirationTime: '5 minutes',
        }
      );
    }

    return 'Send successful';
  }

  public async recoverPassword(data: ChangePasswordDto, session: ExpressSession) {
    if (data.newPassword !== data.confirmPassword)
      throw new UnauthorizedException('Passwords do not match');

    const { otp } = session;
    if (!otp || !Otp.verify(session, data.otp, 'password-reset'))
      throw new UnauthorizedException('OTP expired. Please request a new one.');

    const account = await this.userService.getById(otp.uid);
    if (!account) throw new NotFoundException('User not found');

    const hashedPassword = await authLib.hash(data.newPassword, this.saltRounds);
    await this.userService.updatePassword(account.id, hashedPassword);

    Otp.clear(session);
    return 'Password changed successfully';
  }

  public async sendEmail(
    { to, subject, templateName }: { to: string; subject: string; templateName: EmailTemplate },
    context: Record<string, string | number>
  ) {
    try {
      await this.mailService.sendMail({
        to,
        subject,
        template: 'email',
        context: {
          ...context,
          title: 'MomentUp',
          brandName: 'MomentUp',
          logoUrl: 'https://pbs.twimg.com/media/GuiEzByXUAA9Yz9?format=jpg&name=4096x4096',
          url: {
            contact:
              'https://docs.google.com/forms/d/1oUM87A2Kkv7ME9OhRtNDZ_HyMsoKzJR_lOCwna4T_rU/',
            github: 'https://github.com/byronncat',
            linkedin: 'https://www.linkedin.com/in/thinh-ngo-byron/',
            facebook: 'https://www.facebook.com/profile.php?id=100085017111681',
          },
          templateName,
        },
      });
      return 'Email sent successfully';
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
    session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
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
}
