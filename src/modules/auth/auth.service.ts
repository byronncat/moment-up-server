import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { SupabaseClient } from '@supabase/supabase-js';
// import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
// import { SignupAuthDto } from './dto/signup-auth.dto';
// import { SupabaseService } from '../supabase/supabase.service';
import { accounts } from '../../__mocks__/auth';

@Injectable()
export class AuthService {
  // private readonly supabase: SupabaseClient;
  // private readonly saltRounds: number;

  // constructor(
  //   private readonly supabaseService: SupabaseService,
  //   private readonly configService: ConfigService
  // ) {
  //   this.supabase = this.supabaseService.getClient();
  //   this.saltRounds = Number(this.configService.get<number>('security.hashSaltRounds') || 10);
  // }

  async login(data: LoginDto) {
    const account = accounts.find((account) => account.email === data.identity);
    if (!account) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    if (account.blocked) throw new HttpException('Account is blocked', HttpStatus.FORBIDDEN);
    if (account.password !== data.password)
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    return 'Login success';
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

  // async logout(req: Request, res: Response) {
  //   req.session.destroy((err) => {
  //     if (err) {
  //       console.error(err);
  //       throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
  //     }
  //   });
  //   res.clearCookie('session');
  //   return JSON.stringify('Logout successful');
  // }

  // async verify(req: Request, res: Response) {
  //   if (req.session.user) return JSON.stringify('User authenticated');
  //   res.clearCookie('session');
  //   throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
  // }

  // async hashPassword(password: string): Promise<string> {
  //   const salt = await bcrypt.genSalt(this.saltRounds);
  //   return bcrypt.hash(password, salt);
  // }

  // async comparePasswords(password?: string, hash?: string): Promise<boolean> {
  //   if (!password || !hash) return false;
  //   return bcrypt.compare(password, hash);
  // }
}
