import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
  Req,
  Get,
  Res,
  Delete,
  Query,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginAuthDto, SignupAuthDto } from './dto';

@Controller({
  path: 'auth',
  version: '1',
})
// @UsePipes(new ValidationPipe())
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Query('type') type: 'google' | 'credentials',
    @Body() loginAuthDto: LoginAuthDto,
    @Req() request: Request
  ) {
    return this.authService.login(type, loginAuthDto, request);
  }

  // @Delete('logout')
  // @HttpCode(HttpStatus.OK)
  // logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
  //   return this.authService.logout(request, response);
  // }

  // @Post('signup')
  // @HttpCode(HttpStatus.CREATED)
  // signup(@Body() signupAuthDto: SignupAuthDto, @Req() request: Request) {
  //   return this.authService.signup(signupAuthDto, request);
  // }

  // @Get('verify')
  // @HttpCode(HttpStatus.OK)
  // authenticate(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
  //   return this.authService.verify(request, response);
  // }
}
