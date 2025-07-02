import type { Response } from 'express';
import type { Session, SessionData } from 'express-session';

import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { SupabaseClient } from '@supabase/supabase-js';
import { authLib } from 'src/common/libraries';
import { LoginDto } from './dto/login.dto';
// import { SignupAuthDto } from './dto/signup-auth.dto';
// import { SupabaseService } from '../supabase/supabase.service';
import { accounts } from '../../__mocks__/auth';
import { SESSION_COOKIE_NAME } from 'src/common/constants';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  // private readonly supabase: SupabaseClient;
  private readonly saltRounds: number = this.configService.get<number>('security.hashSaltRounds')!;
  private readonly jwtSecret: string = this.configService.get<string>('security.jwtSecret')!;

  constructor(
    //   private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
    //   this.supabase = this.supabaseService.getClient();
  }

  async verify(session: SessionData, res: Response) {
    if (session.user) {
      const account = accounts.find((acc) => acc.id === session.user.sub);
      if (account)
        return {
          accessToken: this.createAccessToken(account.id, account.username).value,
          user: account,
        };
    }
    res.clearCookie(SESSION_COOKIE_NAME);
    throw new UnauthorizedException('User not authenticated');
  }

  async login(data: LoginDto, session: SessionData) {
    const account = accounts.find(
      (account) => account.email === data.identity || account.username === data.identity
    );

    if (!account) throw new UnauthorizedException('Invalid credentials');
    if (account.blocked) throw new ForbiddenException('Account is blocked');
    if (!(await authLib.compare(data.password, account.password)))
      throw new UnauthorizedException('Invalid credentials');

    const token = this.createAccessToken(account.id, account.username);
    session.user = { sub: account.id, jti: token.jti };

    return {
      accessToken: token.value,
      user: account,
    };
  }

  async logout(session: Session, response: Response) {
    return new Promise((resolve, reject) => {
      session.destroy((err) => {
        if (err) {
          console.error(err);
          reject(new InternalServerErrorException('Internal server error'));
        } else {
          response.clearCookie(SESSION_COOKIE_NAME);
          resolve('Logout successful');
        }
      });
    });
  }

  createAccessToken(userId: string, username: string) {
    const jti = authLib.generateJti();
    const payload = { sub: userId, username: username, jti };
    const token = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: '15m',
    });
    return {
      jti,
      value: token,
    };
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
