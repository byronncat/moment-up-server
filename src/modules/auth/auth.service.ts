import { accounts } from '../../__mocks__/auth';

import type { Response } from 'express';
import type { ExpressSession } from 'express-session';

import { ForbiddenException, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authLib } from 'src/common/libraries';
import { COOKIE_NAME, TOKEN_ID_LENGTH } from 'src/common/constants';
import { LoginDto } from './dto/login.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

type JwtPayload = {
  sub: string;
  jti: string;
};

@Injectable()
export class AuthService {
  private readonly saltRounds: number = this.configService.get<number>('security.hashSaltRounds')!;
  private readonly jwtSecret: string = this.configService.get<string>('security.jwtSecret')!;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {}

  public async verify(session: ExpressSession, refreshToken: string, response: Response) {
    const payload = this.verifyJwtToken(refreshToken);
    if (session.user && payload) {
      const userId = session.user.sub;
      const account = accounts.find((acc) => acc.id === userId);
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
    const account = accounts.find(
      (account) => account.email === data.identity || account.username === data.identity
    );

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

  public async logout(session: ExpressSession, response: Response) {
    this.clearAuthState(session, response);
    return 'Logout successful';
  }

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
