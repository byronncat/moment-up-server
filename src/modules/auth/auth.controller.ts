import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  // Get,
  // Res,
  // Delete,
  // Query,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { AuthService } from './auth.service';
import { LoginDto } from './dto';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
